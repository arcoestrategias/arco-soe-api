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

  async findByMeetingId(meetingId: string): Promise<MinutesResponse[]> {
    const list = await this.prisma.meetingMinutes.findMany({
      where: { meetingId },
      orderBy: { version: 'desc' },
    });
    return list.map(this.mapMinutes);
  }

  async findLatestByMeetingId(
    meetingId: string,
  ): Promise<MinutesResponse | null> {
    const raw = await this.prisma.meetingMinutes.findFirst({
      where: { meetingId },
      orderBy: { version: 'desc' },
    });
    return raw ? this.mapMinutes(raw) : null;
  }

  async create(
    meetingId: string,
    actorId: string,
    agenda?: string[],
  ): Promise<MinutesResponse> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
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
    }));

    const data: MeetingMinutesData = {
      agenda: agenda ?? [],
      positions,
      attendance,
      observations: '',
    };

    const created = await this.prisma.meetingMinutes.create({
      data: {
        meetingId,
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
    dto: { positionId: string; name: string; description?: string; fromAt?: string; untilAt?: string; status?: string; objectiveId?: string },
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
        'Solo el convocante puede crear compromisos en esta reunión.',
      );
    }

    const now = new Date();
    const fromAt = dto.fromAt ? new Date(dto.fromAt) : now;
    const untilAt = dto.untilAt ? new Date(dto.untilAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
      status: priority.status,
      fromAt: priority.fromAt?.toISOString?.() ?? fromAt.toISOString(),
      untilAt: priority.untilAt?.toISOString?.() ?? untilAt.toISOString(),
      priorityId: priority.id,
      createdAt: priority.createdAt?.toISOString?.() ?? new Date().toISOString(),
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

    const logoBuffer = await this.resolveLogoBuffer(meeting.companyId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- Colors ----
      const primary = '#0F274A';
      const gray = '#6B7280';
      const lightGray = '#F3F6FB';
      const border = '#CDD6E1';

      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ---- Header ----
      if (logoBuffer) {
        doc.image(logoBuffer, doc.page.margins.left, 40, {
          width: 60,
          height: 60,
        });
      }

      doc.fontSize(18).fillColor(primary).text('Acta de Reunión', {
        align: 'center',
      });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor(primary)
        .text(meeting.name, { align: 'center' });
      doc
        .fontSize(9)
        .fillColor(gray)
        .text(
          `Versión ${raw.version} · ${raw.status === 'FINALIZED' ? 'Finalizada' : 'Borrador'}`,
          { align: 'center' },
        );
      doc.moveDown(0.3);

      // Meeting info
      doc.fontSize(9).fillColor(gray);
      doc.text(
        `Fecha: ${new Date(meeting.startDate).toLocaleDateString('es-ES', { dateStyle: 'long' })}`,
      );
      doc.text(`Lugar: ${meeting.location ?? 'No especificado'}`);

      if (data.finalizedAt) {
        doc.text(
          `Finalizada: ${new Date(data.finalizedAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}`,
        );
      }

      doc.moveDown(0.5);

      // ---- Separator ----
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);

      // ---- 1. Agenda ----
      doc.fontSize(12).fillColor(primary).text('1. Agenda del día');
      doc.moveDown(0.3);
      if (data.agenda.length === 0) {
        doc.fontSize(9).fillColor(gray).text('Sin agenda registrada.');
      } else {
        data.agenda.forEach((item, i) => {
          doc.fontSize(9).fillColor('#000').text(`${i + 1}. ${item}`, {
            indent: 10,
          });
        });
      }
      doc.moveDown(0.5);

      // ---- Separator ----
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);

      // ---- 2. Desempeño por posición ----
      doc.fontSize(12).fillColor(primary).text('2. Desempeño por posición');
      doc.moveDown(0.3);

      for (const pos of data.positions) {
        const yBefore = doc.y;
        doc
          .fontSize(10)
          .fillColor(primary)
          .text(`${pos.positionName} — ${pos.userName}`, { indent: 10 });

        if (pos.performance) {
          doc.fontSize(8).fillColor(gray);
          const line = `ICO: ${pos.performance.ico.toFixed(1)}%  |  ICP: ${pos.performance.icp.toFixed(1)}%  |  Performance: ${pos.performance.performance.toFixed(1)}%  |  Avance: ${pos.performance.avance.toFixed(1)}%`;
          doc.text(line, { indent: 20 });
        } else {
          doc.fontSize(8).fillColor(gray).text('Sin datos de desempeño', {
            indent: 20,
          });
        }
        doc.moveDown(0.3);
      }

      // ---- 3. Prioridades ----
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primary).text('3. Prioridades');
      doc.moveDown(0.3);

      for (const pos of data.positions) {
        if (pos.priorities.length === 0) continue;
        doc.fontSize(9).fillColor(primary).text(pos.positionName, { indent: 10 });
        pos.priorities.forEach((pr) => {
          const statusLabel =
            pr.status === 'OPE'
              ? 'En proceso'
              : pr.status === 'CLO'
                ? 'Terminado'
                : 'Anulado';
          doc.fontSize(8).fillColor('#000').text(`• ${pr.name} [${statusLabel}]`, {
            indent: 20,
          });
        });
      }

      // ---- 4. Compromisos ----
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primary).text('4. Compromisos');
      doc.moveDown(0.3);

      // 4. Compromisos - priorities created today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      let hasCommitments = false;
      for (const pos of data.positions) {
        const todayPri = (pos.priorities ?? []).filter(
          (p: any) => p.createdAt && new Date(p.createdAt) >= startOfDay,
        );
        if (todayPri.length === 0) continue;
        hasCommitments = true;
        doc
          .fontSize(9)
          .fillColor(primary)
          .text(pos.positionName, { indent: 10 });
        todayPri.forEach((c: any) => {
          doc
            .fontSize(8)
            .fillColor('#000')
            .text(`• ${c.name}${c.description ? `: ${c.description}` : ''}`, {
              indent: 20,
            });
        });
      }
      if (!hasCommitments) {
        doc.fontSize(9).fillColor(gray).text('Sin compromisos registrados.', { indent: 10 });
      }

      // ---- 5. Asistencia ----
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primary).text('5. Asistencia');
      doc.moveDown(0.3);

      for (const a of data.attendance) {
        doc
          .fontSize(9)
          .fillColor('#000')
          .text(
            `${a.present ? '✓' : '✗'} ${a.userName}`,
            { indent: 10 },
          );
      }

      // ---- 6. Observaciones ----
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(border)
        .stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primary).text('6. Observaciones');
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor('#000')
        .text(data.observations || 'Sin observaciones.', { indent: 10 });

      // ---- Footer ----
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(7)
          .fillColor(gray)
          .text(
            `Generado por SOE · Página ${i + 1} de ${totalPages}`,
            doc.page.margins.left,
            doc.page.height - 40,
            { width: pageWidth, align: 'center' },
          );
      }

      doc.end();
    });
  }
}
