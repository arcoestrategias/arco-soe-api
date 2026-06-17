import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PriorityService } from '../../priority/priority.service';
import { FilesService } from '../../files/files.service';
import { PermissionValidatorService } from '../../core/services/permission-validator.service';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import type {
  MeetingMinutesData,
  MinutesResponse,
  MinutesPosition,
  MinutesPrioritySnapshot,
  MinutesAttendance,
  MinutesStatus,
} from '../types/meeting-minutes.types';

@Injectable()
export class MeetingMinutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priorityService: PriorityService,
    private readonly filesService: FilesService,
    private readonly permissionValidator: PermissionValidatorService,
  ) {}

  private mapMinutes(raw: any): MinutesResponse {
    return {
      id: raw.id,
      meetingId: raw.meetingId,
      version: raw.version,
      status: raw.status as MinutesStatus,
      data: raw.data as MeetingMinutesData,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt?.toISOString?.() ?? raw.createdAt,
      updatedAt: raw.updatedAt?.toISOString?.() ?? raw.updatedAt,
    };
  }

  async findByMeetingId(meetingId: string, occurrenceId?: string): Promise<MinutesResponse[]> {
    const where: any = { meetingId };
    if (occurrenceId) where.occurrenceId = occurrenceId;
    const list = await this.prisma.meetingMinutes.findMany({
      where,
      orderBy: { version: 'desc' },
    });
    return list.map(this.mapMinutes);
  }

  async findLatestByMeetingId(
    meetingId: string,
    occurrenceId?: string,
  ): Promise<MinutesResponse | null> {
    const where: any = { meetingId };
    if (occurrenceId) where.occurrenceId = occurrenceId;
    const raw = await this.prisma.meetingMinutes.findFirst({
      where,
      orderBy: { version: 'desc' },
    });
    return raw ? this.mapMinutes(raw) : null;
  }

  async create(
    meetingId: string,
    actorId: string,
    agenda?: string[],
    occurrenceId?: string,
  ): Promise<MinutesResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const latest = await this.prisma.meetingMinutes.findFirst({
      where: { meetingId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const positions: MinutesPosition[] = [];
    for (const p of meeting.participants) {
      const userLink = await this.prisma.userBusinessUnit.findFirst({
        where: { userId: p.userId },
        include: {
          position: { select: { id: true, name: true } },
        },
      });
      positions.push({
        positionId: userLink?.position?.id ?? '',
        positionName: userLink?.position?.name ?? 'Sin posición',
        userName: `${p.user.firstName} ${p.user.lastName}`,
        performance: null,
        priorities: [],
      });
    }

    const attendance: MinutesAttendance[] = meeting.participants.map((p) => ({
      userId: p.userId,
      userName: `${p.user.firstName} ${p.user.lastName}`,
      present: false,
      isRequired: p.isRequired,
      role: p.role,
    }));

    const meetingAgenda = (meeting.agenda as string[]) ?? [];

    const data: MeetingMinutesData = {
      agenda: agenda ?? meetingAgenda,
      positions,
      attendance,
      observations: '',
    };

    const created = await this.prisma.meetingMinutes.create({
      data: {
        meetingId,
        ...(occurrenceId ? { occurrenceId } : {}),
        version,
        status: 'DRAFT',
        data: data as any,
        createdBy: actorId,
      },
    });

    return this.mapMinutes(created);
  }

  async updateDraft(
    meetingId: string,
    actorId: string,
    partial: Partial<MeetingMinutesData>,
  ): Promise<MinutesResponse> {
    const existing = await this.prisma.meetingMinutes.findFirst({
      where: { meetingId, status: 'DRAFT' },
      orderBy: { version: 'desc' },
    });
    if (!existing) throw new NotFoundException('No hay borrador de acta');

    const currentData = existing.data as unknown as MeetingMinutesData;

    const merged: MeetingMinutesData = {
      ...currentData,
      ...partial,
      positions: partial.positions ?? currentData.positions,
      attendance: partial.attendance ?? currentData.attendance,
    };

    const updated = await this.prisma.meetingMinutes.update({
      where: { id: existing.id },
      data: { data: merged as any, updatedBy: actorId },
    });

    return this.mapMinutes(updated);
  }

  async finalize(meetingId: string, actorId: string): Promise<MinutesResponse> {
    const existing = await this.prisma.meetingMinutes.findFirst({
      where: { meetingId, status: 'DRAFT' },
      orderBy: { version: 'desc' },
    });
    if (!existing) throw new NotFoundException('No hay borrador de acta');

    const currentData = existing.data as unknown as MeetingMinutesData;
    currentData.finalizedAt = new Date().toISOString();

    const updated = await this.prisma.meetingMinutes.update({
      where: { id: existing.id },
      data: {
        status: 'FINALIZED',
        data: currentData as any,
        updatedBy: actorId,
      },
    });

    return this.mapMinutes(updated);
  }

  async createPriority(
    meetingId: string,
    dto: {
      positionId: string;
      name: string;
      description?: string;
      fromAt?: string;
      untilAt?: string;
      status?: string;
      objectiveId?: string;
    },
    actorId: string,
  ): Promise<any> {
    // Verify meeting and check permissions
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          select: { userId: true, role: true },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const isConvener =
      meeting.createdBy === actorId ||
      meeting.participants.some(
        (p) => p.role === 'CONVENER' && p.userId === actorId,
      );

    const hasManage = meeting.businessUnitId
      ? await this.permissionValidator.hasPermission(
          actorId,
          meeting.businessUnitId,
          PERMISSIONS.MEETINGS.MANAGE,
        )
      : false;

    if (!isConvener && !hasManage) {
      throw new ForbiddenException(
        'Solo el convocante puede crear prioridades en esta reunión.',
      );
    }

    const now = new Date();
    const fromAt = dto.fromAt ? new Date(dto.fromAt) : now;
    const untilAt = dto.untilAt
      ? new Date(dto.untilAt)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const priority = await this.priorityService.create(
      {
        name: dto.name,
        description: dto.description,
        status: (dto.status ?? 'OPE') as 'OPE' | 'CLO' | 'CAN',
        fromAt,
        untilAt,
        positionId: dto.positionId,
        objectiveId: dto.objectiveId,
      },
      actorId,
    );

    return {
      id: priority.id,
      name: priority.name,
      description: priority.description,
      status: priority.status,
      fromAt: priority.fromAt?.toISOString?.() ?? fromAt.toISOString(),
      untilAt: priority.untilAt?.toISOString?.() ?? untilAt.toISOString(),
      finishedAt: priority.finishedAt?.toISOString?.(),
      priorityId: priority.id,
      objectiveId: priority.objectiveId,
      objectiveName: priority.objectiveName,
      monthlyClass: priority.monthlyClass,
      createdAt:
        priority.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async listPrioritiesToday(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                userBusinessUnits: {
                  select: { positionId: true },
                },
              },
            },
          },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const positionIds = new Set<string>();
    for (const p of meeting.participants) {
      for (const bu of p.user.userBusinessUnits ?? []) {
        if (bu.positionId) positionIds.add(bu.positionId);
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const priorities = await this.prisma.priority.findMany({
      where: {
        positionId: { in: Array.from(positionIds) },
        createdAt: { gte: startOfDay },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return priorities.map((pr) => ({
      id: pr.id,
      name: pr.name,
      description: pr.description,
      status: pr.status,
      fromAt: pr.fromAt?.toISOString?.()?.slice(0, 10) ?? null,
      untilAt: pr.untilAt?.toISOString?.()?.slice(0, 10) ?? null,
      finishedAt: pr.finishedAt?.toISOString?.()?.slice(0, 10) ?? null,
      canceledAt: pr.canceledAt?.toISOString?.()?.slice(0, 10) ?? null,
      positionId: pr.positionId,
      objectiveId: pr.objectiveId,
      createdAt: pr.createdAt?.toISOString?.() ?? null,
    }));
  }

  async getParticipantsPerformance(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { companyId: true, businessUnitId: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userBusinessUnits: {
              select: {
                positionId: true,
                position: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return participants.map((p) => ({
      userId: p.userId,
      userName: `${p.user.firstName} ${p.user.lastName}`,
      positionId: p.user.userBusinessUnits?.[0]?.positionId ?? null,
      positionName:
        p.user.userBusinessUnits?.[0]?.position?.name ?? 'Sin posición',
      role: p.role,
    }));
  }

  // ---- PDF Generation ----

  private async resolveLogoBuffer(companyId: string): Promise<Buffer | null> {
    try {
      const list = await (this.filesService as any).list?.('logo', companyId);
      if (!Array.isArray(list) || list.length === 0) return null;
      const sorted = [...list].sort((a: any, b: any) => {
        const ad = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bd = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bd - ad;
      });
      const f = sorted[0];
      const abs = f?.path
        ? path.isAbsolute(f.path)
          ? f.path
          : path.join(process.cwd(), f.path)
        : path.join(process.cwd(), 'uploads', 'images', f.fileName);
      if (!fs.existsSync(abs)) return null;
      return await fs.promises.readFile(abs);
    } catch {
      return null;
    }
  }

  async generatePdf(minutesId: string): Promise<Buffer> {
    const raw = await this.prisma.meetingMinutes.findUnique({
      where: { id: minutesId },
      include: {
        meeting: {
          include: { company: { select: { id: true, name: true } } },
        },
      },
    });
    if (!raw) throw new NotFoundException('Acta no encontrada');

    const meeting = raw.meeting;
    const data = raw.data as unknown as MeetingMinutesData;
    const logoImage = await this.resolveLogoBuffer(meeting.companyId);

    // ---- Helpers ----
    function mm(v: number) {
      return (v / 25.4) * 72;
    }
    function fmtDate(s?: string | null): string {
      if (!s) return '-';
      const ymd = s.includes('T') ? s.slice(0, 10) : s;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '-';
      const [y, m, d] = ymd.split('-').map(Number);
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    function priorityInMonth(
      pr: MinutesPrioritySnapshot,
      month: number,
      year: number,
    ): boolean {
      if (!pr.untilAt) return false;
      const d = new Date(pr.untilAt);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: mm(14), bottom: mm(14), left: mm(12), right: mm(12) },
        bufferPages: true,
      });
      doc.font('Helvetica');

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ====== Paleta ======
      const H = {
        header: '#0F274A',
        subheader: '#1F3866',
        border: '#CDD6E1',
        bgSoft: '#F3F6FB',
        white: '#FFFFFF',
        black: '#000000',
        rowAlt: '#FAFBFD',
        gray: '#6B7280',
      };

      const pageW = doc.page.width;
      const contentW = pageW - doc.page.margins.left - doc.page.margins.right;

      const HEADER_H = mm(28);
      const COL_L = contentW * 0.22;
      const COL_C = contentW * 0.56;
      const COL_R = contentW * 0.22;
      const FOOTER_ZONE = 30;

      // ====== Header skeleton (cada página) ======
      const drawHeaderSkeleton = () => {
        const x = doc.page.margins.left;
        const y = doc.page.margins.top;
        doc.save().rect(x, y, contentW, HEADER_H).fill(H.bgSoft).restore();
        doc
          .moveTo(x, y + HEADER_H + 2)
          .lineTo(x + contentW, y + HEADER_H + 2)
          .strokeColor(H.border)
          .lineWidth(1)
          .stroke();

        const padBox = 6,
          box = {
            x: x + padBox,
            y: y + padBox,
            w: COL_L - padBox * 2,
            h: HEADER_H - padBox * 2,
          };
        if (logoImage) {
          try {
            doc.image(logoImage, box.x, box.y, {
              fit: [box.w, box.h],
              align: 'center',
              valign: 'center',
            });
          } catch {
            doc.rect(box.x, box.y, box.w, box.h).strokeColor(H.border).stroke();
            doc
              .fontSize(8)
              .text('—', box.x, box.y + box.h / 2 - 4, {
                width: box.w,
                align: 'center',
              });
          }
        } else {
          doc.rect(box.x, box.y, box.w, box.h).strokeColor(H.border).stroke();
          doc
            .fontSize(8)
            .fillColor(H.black)
            .text('—', box.x, box.y + box.h / 2 - 4, {
              width: box.w,
              align: 'center',
            });
        }

        doc
          .save()
          .fillColor(H.header)
          .font('Helvetica-Bold')
          .fontSize(16)
          .text('ACTA DE REUNIÓN', x + COL_L, y + HEADER_H / 2 - 10, {
            width: COL_C,
            align: 'center',
          })
          .restore();

        const rp = 6,
          rw = COL_R - rp * 2,
          ry = y + rp,
          cellH = 16;
        for (let i = 0; i < 3; i++)
          doc
            .rect(x + COL_L + COL_C + rp, ry + i * cellH, rw, cellH)
            .strokeColor(H.border)
            .lineWidth(1)
            .stroke();
      };

      const drawHeaderTexts = (page: number, total: number) => {
        const x = doc.page.margins.left,
          y = doc.page.margins.top;
        const rp = 6,
          rx = x + COL_L + COL_C + rp,
          ry = y + rp,
          rw = COL_R - rp * 2,
          cellH = 16;
        doc
          .save()
          .rect(rx + 1, ry + 1, rw - 2, cellH * 3 - 2)
          .fill(H.white)
          .restore();
        doc.fontSize(9).fillColor(H.black);
        doc
          .font('Helvetica-Bold')
          .text('Versión: ', rx + 4, ry + 3, { continued: true });
        doc.font('Helvetica').text(`v${raw.version}`, { lineBreak: false });
        doc
          .font('Helvetica-Bold')
          .text('Fecha: ', rx + 4, ry + 3 + cellH, { continued: true });
        doc
          .font('Helvetica')
          .text(fmtDate(now.toISOString()), { lineBreak: false });
        doc
          .font('Helvetica-Bold')
          .text('Página: ', rx + 4, ry + 3 + cellH * 2, { continued: true });
        doc.font('Helvetica').text(`${page} de ${total}`, { lineBreak: false });
      };

      const drawFooter = () => {
        const y = doc.page.height - doc.page.margins.bottom - FOOTER_ZONE + 4;
        doc.fontSize(7).fillColor(H.gray)
          .text('Copyright ©2025 Arco Estrategias. Todos los derechos reservados.',
            doc.page.margins.left, y, { width: contentW, align: 'center' });
      };

      // ====== Content helpers ======
      function drawMetadataRow(label: string, value: string, y: number) {
        const rowH = 18;
        doc
          .rect(doc.page.margins.left, y, contentW, rowH)
          .fill(H.bgSoft)
          .strokeColor(H.border)
          .lineWidth(1)
          .stroke();
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(H.header)
          .text(label, doc.page.margins.left + 6, y + 4, {
            width: contentW * 0.2,
          });
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(H.black)
          .text(value, doc.page.margins.left + contentW * 0.22, y + 4, {
            width: contentW * 0.76,
          });
        return y + rowH;
      }

      function resolveMonthlyLabel(mc?: string): string | undefined {
        const map: Record<string, string> = {
          ABIERTAS: 'En proceso',
          EN_PROCESO: 'En proceso',
          ANULADAS: 'Anulada',
          CUMPLIDAS_A_TIEMPO: 'Cumplida a tiempo',
          CUMPLIDAS_ATRASADAS_DEL_MES: 'Cumplida tarde',
          CUMPLIDAS_ATRASADAS_MESES_ANTERIORES: 'Cumplida tarde',
          CUMPLIDAS_DE_OTRO_MES: 'Cumplida otro mes',
          NO_CUMPLIDAS_ATRASADAS_DEL_MES: 'Atrasada',
          NO_CUMPLIDAS_ATRASADAS_MESES_ANTERIORES: 'Muy atrasada',
          NO_CUMPLIDAS_ATRASADAS: 'Atrasada',
          NO_CUMPLIDAS_MESES_ATRAS: 'Muy atrasada',
        };
        if (!mc) return undefined;
        const key = mc.toUpperCase();
        if (map[key]) return map[key];
        if (key.includes('CUMPLIDAS') && key.includes('ATRASADAS'))
          return 'Cumplida tarde';
        if (key.startsWith('NO_CUMPLIDAS')) {
          if (
            key.includes('MESES') ||
            key.includes('ANTERIORES') ||
            key.includes('ATRAS')
          )
            return 'Muy atrasada';
          return 'Atrasada';
        }
        return undefined;
      }

      function resolveMonthlyStyle(
        mc?: string,
      ): { bg: string; fg: string } | undefined {
        const map: Record<string, { bg: string; fg: string }> = {
          ABIERTAS: { bg: '#fde047', fg: '#b09c31' },
          EN_PROCESO: { bg: '#fde047', fg: '#b09c31' },
          ANULADAS: { bg: '#d1d5db', fg: '#000000' },
          CUMPLIDAS_A_TIEMPO: { bg: '#86efac', fg: '#16a34a' },
          CUMPLIDAS_ATRASADAS_DEL_MES: { bg: '#16a34a', fg: '#ffffff' },
          CUMPLIDAS_ATRASADAS_MESES_ANTERIORES: {
            bg: '#16a34a',
            fg: '#ffffff',
          },
          CUMPLIDAS_DE_OTRO_MES: { bg: '#116b31', fg: '#ffffff' },
          NO_CUMPLIDAS_ATRASADAS_DEL_MES: { bg: '#fca5a5', fg: '#dc2626' },
          NO_CUMPLIDAS_ATRASADAS_MESES_ANTERIORES: {
            bg: '#dc2626',
            fg: '#ffffff',
          },
          NO_CUMPLIDAS_ATRASADAS: { bg: '#fca5a5', fg: '#dc2626' },
          NO_CUMPLIDAS_MESES_ATRAS: { bg: '#dc2626', fg: '#ffffff' },
        };
        if (!mc) return undefined;
        const key = mc.toUpperCase();
        if (map[key]) return map[key];
        if (key.includes('CUMPLIDAS') && key.includes('ATRASADAS'))
          return { bg: '#16a34a', fg: '#ffffff' };
        if (key.startsWith('NO_CUMPLIDAS')) {
          if (
            key.includes('MESES') ||
            key.includes('ANTERIORES') ||
            key.includes('ATRAS')
          )
            return { bg: '#dc2626', fg: '#ffffff' };
          return { bg: '#fca5a5', fg: '#dc2626' };
        }
        return undefined;
      }

      // ====== PRIMERA PÁGINA: dibujar contenido ======
      drawHeaderSkeleton();
      doc.y = doc.page.margins.top + HEADER_H + 12;

      // ---- 1. Metadata ----
      doc.y = drawMetadataRow('Reunión:', meeting.name ?? '-', doc.y);
      doc.y = drawMetadataRow(
        'Fecha:',
        fmtDate(new Date(meeting.startDate).toISOString()),
        doc.y,
      );
      doc.y = drawMetadataRow(
        'Lugar:',
        meeting.location ?? 'No especificado',
        doc.y,
      );
      doc.y = drawMetadataRow('Compañía:', meeting.company?.name ?? '-', doc.y);
      if (data.finalizedAt) {
        doc.y = drawMetadataRow(
          'Estado:',
          `Finalizada · ${fmtDate(data.finalizedAt)}`,
          doc.y,
        );
      } else {
        doc.y = drawMetadataRow('Estado:', `Borrador · v${raw.version}`, doc.y);
      }
      doc.moveDown(0.5);

      const halfW = contentW * 0.48;
      const cellPad = 6;

      // Draw two-column row header
      const headerY = doc.y;
      const rowHeaderH = 20;
      doc
        .save()
        .rect(doc.page.margins.left, headerY, halfW, rowHeaderH)
        .fill(H.header)
        .restore();
      doc
        .save()
        .rect(
          doc.page.margins.left + halfW + contentW * 0.04,
          headerY,
          halfW,
          rowHeaderH,
        )
        .fill(H.header)
        .restore();
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#fff')
        .text('Agenda del día', doc.page.margins.left + cellPad, headerY + 4, {
          width: halfW - cellPad * 2,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#fff')
        .text(
          'Asistencia',
          doc.page.margins.left + halfW + contentW * 0.04 + cellPad,
          headerY + 4,
          { width: halfW - cellPad * 2 },
        );
      doc.y = headerY + rowHeaderH;

      // Agenda items
      const agendaStartY = doc.y;
      if (data.agenda.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(H.gray)
          .text(
            'Sin agenda registrada.',
            doc.page.margins.left + cellPad,
            doc.y,
            { width: halfW - cellPad * 2 },
          );
      } else {
        data.agenda.forEach((item, i) => {
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(H.black)
            .text(`${i + 1}. ${item}`, doc.page.margins.left + cellPad, doc.y, {
              width: halfW - cellPad * 2,
            });
        });
      }
      const agendaEndY = doc.y;

      // Attendance items (right column)
      doc.y = agendaStartY;
      for (const a of data.attendance) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(H.black)
          .text(
            `${a.present ? 'Asistió:' : 'No asistió:'} ${a.userName}${a.role === 'CONVENER' ? ' (Convocante)' : ''}${a.isRequired ? ' · Obligatorio' : ''}`,
            doc.page.margins.left + halfW + contentW * 0.04 + cellPad,
            doc.y,
            { width: halfW - cellPad * 2 },
          );
      }

      doc.y = Math.max(agendaEndY, doc.y);
      doc.moveDown(0.3);

      // Bottom border for the two-column block
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + contentW, doc.y)
        .strokeColor(H.border)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.5);

      const perfCols = ['ICO', 'ICP', 'Performance', 'Avance del Proyecto'];
      const perfWidths = [
        contentW * 0.25,
        contentW * 0.25,
        contentW * 0.25,
        contentW * 0.25,
      ];
      const rowH = 22;
      const footerZone = doc.page.height - FOOTER_ZONE;

      function checkPageBreak(needed: number) {
        if (doc.y + needed > footerZone) {
          doc.addPage();
          drawHeaderSkeleton();
          doc.y = doc.page.margins.top + HEADER_H + 12;
          return true;
        }
        return false;
      }

      function drawPerfHeader() {
        const phy = doc.y;
        doc
          .save()
          .rect(doc.page.margins.left, phy, contentW, rowH)
          .fill(H.header)
          .restore();
        let px = doc.page.margins.left;
        perfCols.forEach((text, i) => {
          doc.rect(px, phy, perfWidths[i], rowH).stroke(H.border);
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#fff')
            .text(text, px + 4, phy + 5, {
              width: perfWidths[i] - 8,
              align: 'center',
            });
          px += perfWidths[i];
        });
        doc.y = phy + rowH;
      }

      function drawPriorityTable(
        title: string,
        filtered: MinutesPrioritySnapshot[],
      ) {
        const unique = Array.from(
          new Map(filtered.map((p) => [p.id, p])).values(),
        );
        if (unique.length === 0) return;
        checkPageBreak(rowH * 2 + unique.length * rowH + 20);
        doc.x = doc.page.margins.left;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(H.subheader)
          .text(title);
        doc.moveDown(0.2);

        const cw = {
          n: contentW * 0.025,
          name: contentW * 0.195,
          objective: contentW * 0.17,
          result: contentW * 0.165,
          fromAt: contentW * 0.08,
          untilAt: contentW * 0.09,
          finishedAt: contentW * 0.09,
          progress: contentW * 0.09,
          notes: contentW * 0.085,
        };
        const colKeys = [
          'n',
          'name',
          'objective',
          'result',
          'fromAt',
          'untilAt',
          'finishedAt',
          'progress',
          'notes',
        ] as const;
        const headers = [
          'N°',
          'Prioridad',
          'Objetivo al que impacta',
          'Resultado',
          'Fecha acuerdo',
          'Fecha compromiso',
          'Fecha culminación',
          'Progreso',
          'Notas',
        ];
        const headerAlign = [
          'center',
          'left',
          'left',
          'left',
          'center',
          'center',
          'center',
          'center',
          'left',
        ] as const;

        const hy = doc.y;
        doc
          .save()
          .rect(doc.page.margins.left, hy, contentW, rowH)
          .fill(H.header)
          .restore();
        let hx = doc.page.margins.left;
        headers.forEach((text, i) => {
          const w = cw[colKeys[i]];
          doc.rect(hx, hy, w, rowH).stroke(H.border);
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#fff')
            .text(text, hx + 3, hy + 4, {
              width: w - 6,
              align: headerAlign[i],
              ellipsis: true,
            });
          hx += w;
        });
        doc.y = hy + rowH;

        unique.forEach((pr, idx) => {
          const ml = resolveMonthlyLabel(pr.monthlyClass);
          const statusLabel =
            ml ??
            (pr.status === 'OPE'
              ? 'En proceso'
              : pr.status === 'CLO'
                ? 'Terminado'
                : 'Anulado');
          const style = resolveMonthlyStyle(pr.monthlyClass);
          const ry = doc.y;
          const rowBg = idx % 2 === 1 ? H.rowAlt : undefined;
          if (rowBg)
            doc.rect(doc.page.margins.left, ry, contentW, rowH).fill(rowBg);

          let rx = doc.page.margins.left;
          const cts: Record<string, string> = {
            n: String(idx + 1),
            name: pr.name,
            objective: pr.objectiveName ?? '-',
            result: pr.description ?? '-',
            fromAt: fmtDate(pr.fromAt),
            untilAt: fmtDate(pr.untilAt),
            finishedAt:
              pr.status === 'CLO' && pr.finishedAt
                ? fmtDate(pr.finishedAt)
                : pr.status === 'CAN' && pr.canceledAt
                  ? fmtDate(pr.canceledAt)
                  : '-',
            progress: statusLabel,
            notes: '',
          };

          colKeys.forEach((key, i) => {
            const w = cw[key];
            const text = cts[key];
            if (key === 'progress') {
              const padX = 3,
                padY = 2;
              const bw = w - padX * 2,
                bh = rowH - padY * 2;
              if (style) {
                doc
                  .save()
                  .rect(rx + padX, ry + padY, bw, bh)
                  .fill(style.bg)
                  .restore();
                doc
                  .font('Helvetica-Bold')
                  .fontSize(7)
                  .fillColor(style.fg)
                  .text(text, rx + padX, ry + 4, {
                    width: bw,
                    align: 'center',
                    ellipsis: true,
                  });
              } else {
                doc.rect(rx, ry, w, rowH).stroke(H.border);
                doc
                  .font('Helvetica')
                  .fontSize(7)
                  .fillColor('#000')
                  .text(text, rx + 3, ry + 4, {
                    width: w - 6,
                    align: 'center',
                    ellipsis: true,
                  });
              }
            } else {
              doc.rect(rx, ry, w, rowH).stroke(H.border);
              doc
                .font('Helvetica')
                .fontSize(7)
                .fillColor('#000')
                .text(text, rx + 3, ry + 4, {
                  width: w - 6,
                  align: headerAlign[i],
                  ellipsis: true,
                });
            }
            rx += w;
          });
          doc.y = ry + rowH;
        });
        doc.moveDown(0.3);
      }

      for (const pos of data.positions) {
        checkPageBreak(rowH * 4 + 40);

        // Title per position
        doc.x = doc.page.margins.left;
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(H.header)
          .text(
            `Desempeño y Prioridades - ${pos.positionName} - ${pos.userName}`,
          );
        doc.moveDown(0.4);

        // Performance header + row
        drawPerfHeader();
        const perfY = doc.y;
        let px = doc.page.margins.left;
        const perfValues = [
          pos.performance ? `${pos.performance.ico.toFixed(1)}%` : '-',
          pos.performance ? `${pos.performance.icp.toFixed(1)}%` : '-',
          pos.performance ? `${pos.performance.performance.toFixed(1)}%` : '-',
          pos.performance ? `${pos.performance.avance.toFixed(1)}%` : '-',
        ];
        perfValues.forEach((text, i) => {
          doc.rect(px, perfY, perfWidths[i], rowH).stroke(H.border);
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(H.black)
            .text(text, px + 4, perfY + 5, {
              width: perfWidths[i] - 8,
              align: 'center',
            });
          px += perfWidths[i];
        });
        doc.y = perfY + rowH;

        doc.moveDown(0.5);

        // Priorities per month
        const months = [
          {
            label: 'Prioridades Atrasadas',
            filter: (p: MinutesPrioritySnapshot) =>
              !priorityInMonth(p, currentMonth, currentYear) &&
              !priorityInMonth(p, nextMonth, nextYear),
          },
          {
            label: 'Prioridades del Mes actual',
            filter: (p: MinutesPrioritySnapshot) =>
              priorityInMonth(p, currentMonth, currentYear),
          },
          {
            label: 'Prioridades del Próximo Mes',
            filter: (p: MinutesPrioritySnapshot) =>
              priorityInMonth(p, nextMonth, nextYear),
          },
        ];

        for (const m of months) {
          const filtered = (pos.priorities ?? []).filter(m.filter);
          drawPriorityTable(m.label, filtered);
        }
        doc.moveDown(0.3);
      }

      doc.x = doc.page.margins.left;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(H.header)
        .text('Observaciones');
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor(H.black)
        .text(data.observations || 'Sin observaciones.', { indent: 10 });

      // ====== Post-render: header texts + footer en cada página ======
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawHeaderTexts(i - range.start + 1, range.count);
        drawFooter();
      }

      doc.end();
    });
  }
}
