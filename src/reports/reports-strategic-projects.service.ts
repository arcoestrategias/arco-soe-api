import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import type * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

import { StrategicProjectsReportDto } from './dto/strategic-projects-report.dto';
import { FilesService } from 'src/files/files.service';
import { PositionsRepository } from 'src/position/repositories/positions.repository';
import { BusinessUnitsRepository } from 'src/business-unit/repositories/business-units.repository';
import { StrategicProjectService } from 'src/strategic-project/strategic-project.service';

// ====== Paleta / constantes visuales ======
const HEX = {
  header: '#0F274A',
  subheader: '#1F3866',
  border: '#CDD6E1',
  bgSoft: '#F3F6FB',
  white: '#FFFFFF',
  black: '#000000',
  rowAlt: '#FAFBFD',
};

const FOOTER_ZONE = 18;
const VERSION = '0.1v';

function mm(v: number) {
  return (v / 25.4) * 72;
}
function fmtDate(d?: Date | null) {
  if (!d || isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
function parseISO(s?: string | Date | null) {
  if (!s) return null;
  if (s instanceof Date) {
    return isNaN(s.getTime()) ? null : s;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function safe(v: any, fb = '—') {
  return (v ?? '') === '' || v == null ? fb : String(v);
}

// ========= Helpers (logo) =========
async function resolveLogoBuffer(
  filesService: FilesService,
  companyId: string,
): Promise<Buffer | null> {
  try {
    const list = await (filesService as any).list?.('logo', companyId);
    if (!Array.isArray(list) || list.length === 0) return null;
    const sorted = [...list].sort((a, b) => {
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

@Injectable()
export class ReportsStrategicProjectsService {
  constructor(
    private readonly filesService: FilesService,
    private readonly positionsRepo: PositionsRepository,
    private readonly businessUnitsRepo: BusinessUnitsRepository,
    private readonly spService: StrategicProjectService, // ← reutilizamos este service
  ) {}

  // ===== helper común de texto centrado vertical =====
  private drawCenteredText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      bold?: boolean;
      size?: number;
      color?: string;
      align?: PDFKit.Mixins.TextOptions['align'];
    } = {},
  ) {
    const { bold = false, size = 7, color = HEX.black, align = 'left' } = opts;

    doc.save();
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(color);
    const th = doc.heightOfString(text, { width: w - 2, align });
    const y0 = y + Math.max(0, (h - th) / 2);
    doc.text(text, x + 1, y0, { width: w - 2, align });
    doc.restore();
  }

  private drawLabeledRow(
    doc: PDFKit.PDFDocument,
    r: { x: number; y: number; w: number; h: number },
    label: string,
    value: string,
    labelW: number,
  ) {
    const valueW = r.w - labelW;
    doc.save().rect(r.x, r.y, r.w, r.h).fill(HEX.bgSoft).restore();
    doc.rect(r.x, r.y, r.w, r.h).strokeColor(HEX.border).lineWidth(1).stroke();
    this.drawCenteredText(doc, label, r.x + 4, r.y, labelW - 8, r.h, {
      bold: true,
      size: 10,
    });
    this.drawCenteredText(doc, value, r.x + labelW + 6, r.y, valueW - 12, r.h, {
      size: 10,
    });
  }

  // ===== Header / Footer =====
  private drawHeaderSkeleton(
    doc: PDFKit.PDFDocument,
    contentW: number,
    logoImage: Buffer | null,
  ) {
    const x = doc.page.margins.left;
    const y = doc.page.margins.top;
    const HEADER_H = mm(28);
    const COL_L = contentW * 0.22;
    const COL_C = contentW * 0.56;
    const COL_R = contentW * 0.22;

    doc.save().rect(x, y, contentW, HEADER_H).fill(HEX.bgSoft).restore();
    doc
      .moveTo(x, y + HEADER_H + 2)
      .lineTo(x + contentW, y + HEADER_H + 2)
      .strokeColor(HEX.border)
      .lineWidth(1)
      .stroke();

    // Logo
    const padBox = 6;
    const box = {
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
        doc.rect(box.x, box.y, box.w, box.h).strokeColor(HEX.border).stroke();
        doc.fontSize(8).text('—', box.x, box.y + box.h / 2 - 4, {
          width: box.w,
          align: 'center',
        });
      }
    } else {
      doc.rect(box.x, box.y, box.w, box.h).strokeColor(HEX.border).stroke();
      doc
        .fontSize(8)
        .fillColor(HEX.black)
        .text('—', box.x, box.y + box.h / 2 - 4, {
          width: box.w,
          align: 'center',
        });
    }

    // Título
    doc
      .save()
      .fillColor(HEX.header)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('PROYECTOS ESTRATÉGICOS', x + COL_L, y + HEADER_H / 2 - 10, {
        width: COL_C,
        align: 'center',
      })
      .restore();

    // Caja derecha (3 filas)
    const rp = 6,
      rw = COL_R - rp * 2,
      ry = y + rp,
      cellH = 16;
    for (let i = 0; i < 3; i++) {
      doc
        .rect(x + COL_L + COL_C + rp, ry + i * cellH, rw, cellH)
        .strokeColor(HEX.border)
        .lineWidth(1)
        .stroke();
    }
  }

  private drawHeaderTexts(
    doc: PDFKit.PDFDocument,
    contentW: number,
    now: Date,
    page: number,
    total: number,
  ) {
    const x = doc.page.margins.left;
    const y = doc.page.margins.top;
    const COL_L = contentW * 0.22;
    const COL_C = contentW * 0.56;
    const COL_R = contentW * 0.22;

    const rp = 6,
      rx = x + COL_L + COL_C + rp,
      ry = y + rp,
      rw = COL_R - rp * 2,
      cellH = 16;

    doc
      .save()
      .rect(rx + 1, ry + 1, rw - 2, cellH * 3 - 2)
      .fill(HEX.white)
      .restore();

    doc.fontSize(9).fillColor(HEX.black);
    doc
      .font('Helvetica-Bold')
      .text('Versión: ', rx + 4, ry + 3, { continued: true });
    doc.font('Helvetica').text(VERSION, { lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .text('Fecha impresión: ', rx + 4, ry + 3 + cellH, { continued: true });
    doc.font('Helvetica').text(fmtDate(now), { lineBreak: false });

    doc
      .font('Helvetica-Bold')
      .text(`Página ${page} de ${total}`, rx + 4, ry + 3 + cellH * 2, {
        lineBreak: false,
      });
  }

  private drawFooter(doc: PDFKit.PDFDocument, contentW: number) {
    const text =
      'Copyright ©2025 Arco Estrategias. Todos los derechos reservados.';
    const x = doc.page.margins.left;
    const y = doc.page.height - doc.page.margins.bottom - FOOTER_ZONE + 4;
    doc
      .save()
      .font('Helvetica')
      .fontSize(7)
      .fillColor(HEX.black)
      .text(text, x, y, {
        width: contentW,
        align: 'center',
        lineBreak: false,
      })
      .restore();
  }

  // =========================================================

  async generatePdf(dto: StrategicProjectsReportDto): Promise<Buffer> {
    // 0) Resolver companyId si no viene
    let companyId: string | null | undefined = dto.companyId;
    if (!companyId && dto.businessUnitId) {
      companyId = await this.businessUnitsRepo.findCompanyIdByBusinessUnit(
        dto.businessUnitId,
      );
    }
    if (!companyId) {
      throw new Error('No se pudo determinar el companyId');
    }

    // 1) Datos base
    const now = new Date();
    const logoImage = await resolveLogoBuffer(this.filesService, companyId);

    // 2) Firmas CEO / Especialista
    const { ceo, specialist } =
      await this.positionsRepo.findCeoAndSpecialistByCompanyAndBU(
        companyId,
        dto.businessUnitId,
      );
    const approverName = ceo?.nameUser ?? '—';
    const approverPosition = ceo?.namePosition ?? 'Gerente General';
    const reviewerName = specialist?.nameUser ?? '—';
    const reviewerPosition =
      specialist?.namePosition ?? 'Asistente de Gestión y Control';

    // 3) Estructura del proyecto (reutilizando StrategicProjectService)
    const structure = await this.spService.getProjectStructure({
      projectId: dto.projectId,
      includeInactiveFactors: false,
      includeInactiveTasks: false,
      includeInactiveParticipants: false,
    });
    const project = structure?.project;

    // Leader de proyecto (posición)
    const leaderPositionName =
      project?.leader?.position?.name ?? project?.position?.name ?? '—';

    // 4) PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: mm(14), bottom: mm(14), left: mm(12), right: mm(12) },
      bufferPages: true,
    });
    doc.font('Helvetica');

    const chunks: Buffer[] = [];
    const pageW = doc.page.width;
    const contentW = pageW - doc.page.margins.left - doc.page.margins.right;

    const moveBelowHeader = () => {
      const HEADER_H = mm(28);
      doc.x = doc.page.margins.left;
      doc.y = doc.page.margins.top + HEADER_H + 10;
    };

    // stream
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      this.drawHeaderSkeleton(doc, contentW, logoImage);
      moveBelowHeader();

      // === Metadatos del reporte ===
      const x = doc.page.margins.left;
      let y = doc.y;
      const rowH = 18;
      const labelW = contentW * 0.22;

      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Plan estratégico:',
        dto.strategicPlan?.name ?? '—',
        labelW,
      );
      y += rowH;

      const pStart = fmtDate(parseISO(dto.strategicPlan?.periodStart));
      const pEnd = fmtDate(parseISO(dto.strategicPlan?.periodEnd));
      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Periodo:',
        `${pStart} - ${pEnd}`,
        labelW,
      );
      y += rowH;

      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Nombre del proyecto:',
        project?.name ?? '—',
        labelW,
      );
      y += rowH;

      // NUEVO: Objetivo del proyecto
      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Objetivo del proyecto:',
        project?.objective?.name ?? '—',
        labelW,
      );
      y += rowH;

      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Líder de Proyecto:',
        leaderPositionName,
        labelW,
      );
      y += rowH;

      const projStart = fmtDate(parseISO(project?.fromAt));
      const projEnd = fmtDate(parseISO(project?.untilAt));
      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Fecha de inicio:',
        projStart,
        labelW,
      );
      y += rowH;

      this.drawLabeledRow(
        doc,
        { x, y, w: contentW, h: rowH },
        'Fecha fin:',
        projEnd,
        labelW,
      );
      doc.y = y + rowH + 10;

      // =========================
      // SECCIÓN 1: FCE y Resultados
      // =========================
      const tX1 = doc.page.margins.left;
      const tY1 = doc.y;
      const c1 = contentW * 0.48;
      const c2 = contentW - c1;

      const headH1 = 22;

      // Header 2 columnas
      doc.save().rect(tX1, tY1, c1, headH1).fill(HEX.header).restore();
      this.drawCenteredText(
        doc,
        'Factores clave de éxito',
        tX1,
        tY1,
        c1,
        headH1,
        {
          bold: true,
          color: HEX.white,
          size: 10,
          align: 'center',
        },
      );

      doc
        .save()
        .rect(tX1 + c1, tY1, c2, headH1)
        .fill(HEX.header)
        .restore();
      this.drawCenteredText(
        doc,
        'Resultado del FCE (Entregable)',
        tX1 + c1,
        tY1,
        c2,
        headH1,
        {
          bold: true,
          color: HEX.white,
          size: 10,
          align: 'center',
        },
      );

      // Bordes header
      doc.rect(tX1, tY1, c1, headH1).strokeColor(HEX.border).stroke();
      doc
        .rect(tX1 + c1, tY1, c2, headH1)
        .strokeColor(HEX.border)
        .stroke();

      let yRow = tY1 + headH1;
      const factors = (project?.factors ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      for (let i = 0; i < factors.length; i++) {
        const f = factors[i];
        const leftText = `${i + 1}. ${safe(f.name)}`;
        const rightText = `${i + 1}. ${safe(f.result)}`;

        // Altura dinámica por fila
        const pad = 6;
        const measureH = (txt: string, w: number) => {
          doc.save().font('Helvetica').fontSize(7);
          const h = doc.heightOfString(txt, { width: w - pad * 2 });
          doc.restore();
          return Math.max(22, h + pad * 2);
        };
        const rowH1 = Math.max(measureH(leftText, c1), measureH(rightText, c2));

        // salto de página si no cabe
        const bottomSafe =
          doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;
        if (yRow + rowH1 > bottomSafe) {
          doc.addPage({
            size: 'A4',
            layout: 'landscape',
            margins: {
              top: mm(14),
              bottom: mm(14),
              left: mm(12),
              right: mm(12),
            },
          });
          this.drawHeaderSkeleton(doc, contentW, logoImage);
          moveBelowHeader();
          // reimprime headers
          const ny = doc.y;
          doc.save().rect(tX1, ny, c1, headH1).fill(HEX.header).restore();
          this.drawCenteredText(
            doc,
            'Factores clave de éxito',
            tX1,
            ny,
            c1,
            headH1,
            {
              bold: true,
              color: HEX.white,
              size: 10,
              align: 'center',
            },
          );
          doc
            .save()
            .rect(tX1 + c1, ny, c2, headH1)
            .fill(HEX.header)
            .restore();
          this.drawCenteredText(
            doc,
            'Resultado del FCE (Entregable)',
            tX1 + c1,
            ny,
            c2,
            headH1,
            {
              bold: true,
              color: HEX.white,
              size: 10,
              align: 'center',
            },
          );
          doc.rect(tX1, ny, c1, headH1).strokeColor(HEX.border).stroke();
          doc
            .rect(tX1 + c1, ny, c2, headH1)
            .strokeColor(HEX.border)
            .stroke();
          yRow = ny + headH1;
        }

        // celdas
        doc.rect(tX1, yRow, c1, rowH1).strokeColor(HEX.border).stroke();
        doc
          .rect(tX1 + c1, yRow, c2, rowH1)
          .strokeColor(HEX.border)
          .stroke();

        // textos
        doc.font('Helvetica').fontSize(9).fillColor(HEX.black);
        doc.text(leftText, tX1 + pad, yRow + pad, {
          width: c1 - pad * 2,
          align: 'left',
        });
        doc.text(rightText, tX1 + c1 + pad, yRow + pad, {
          width: c2 - pad * 2,
          align: 'left',
        });

        yRow += rowH1;
      }

      doc.y = yRow + 10;

      // =========================
      // SECCIÓN 2: Factores + Tareas (13 columnas)
      // =========================
      const columns = [
        { key: 'n', title: 'N°', w: contentW * 0.03, align: 'center' as const },
        {
          key: 'accion',
          title: 'Acciones Clave',
          w: contentW * 0.12,
          align: 'center' as const,
        },
        {
          key: 'just',
          title: 'Justificación',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'ini',
          title: 'Inicio',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'fin',
          title: 'Fin',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'ent',
          title: 'Entregables',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'resp',
          title: 'Responsable',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'met',
          title: 'Metodología',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'apo',
          title: 'Apoyos',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'inv',
          title: 'Inversión',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'lim',
          title: 'Limitación',
          w: contentW * 0.07,
          align: 'center' as const,
        },
        {
          key: 'obs',
          title: 'Observación',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'avc',
          title: 'Avance',
          w: contentW * 0.07,
          align: 'center' as const,
        },
      ];

      const tX2 = doc.page.margins.left;
      let tY2 = doc.y;

      // Header de la sección 2
      const headH2 = 24;
      doc.save().rect(tX2, tY2, contentW, headH2).fill(HEX.header).restore();
      let cx = tX2;
      for (const col of columns) {
        this.drawCenteredText(doc, col.title, cx, tY2, col.w, headH2, {
          bold: true,
          color: HEX.white,
          size: 7,
          align: col.align,
        });
        cx += col.w;
      }
      doc.rect(tX2, tY2, contentW, headH2).strokeColor(HEX.border).stroke();
      tY2 += headH2;

      const participants = project?.participants ?? [];
      const participantMap = new Map<string, string>(); // projectParticipantId -> positionName
      for (const p of participants) {
        participantMap.set(p.id, p.position?.name ?? '—');
      }

      const drawRowBorders = (y0: number, h: number) => {
        doc
          .rect(tX2, y0, contentW, h)
          .strokeColor(HEX.border)
          .lineWidth(1)
          .stroke();
        let vx = tX2;
        for (const col of columns) {
          doc
            .moveTo(vx, y0)
            .lineTo(vx, y0 + h)
            .strokeColor(HEX.border)
            .stroke();
          vx += col.w;
        }
        doc
          .moveTo(tX2 + contentW, y0)
          .lineTo(tX2 + contentW, y0 + h)
          .strokeColor(HEX.border)
          .stroke();
      };

      const bottomSafe = () =>
        doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;

      // Recorremos factores y sus tareas
      for (let i = 0; i < factors.length; i++) {
        const f = factors[i];
        const tasks = (f.tasks ?? [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const totalTasks = tasks.length || 1;
        const finished =
          f.taskClo ??
          tasks.filter((t) => (t.status ?? '').toUpperCase() === 'CLO').length;
        const factorProgress = Number(
          ((finished / totalTasks) * 100).toFixed(2),
        );

        // Fila de FACTOR (título que ocupa 12 columnas + Avance)
        const factorRowH = 22;
        if (tY2 + factorRowH > bottomSafe()) {
          // nueva página + reimprimir header
          doc.addPage({
            size: 'A4',
            layout: 'landscape',
            margins: {
              top: mm(14),
              bottom: mm(14),
              left: mm(12),
              right: mm(12),
            },
          });
          this.drawHeaderSkeleton(doc, contentW, logoImage);
          moveBelowHeader();
          tY2 = doc.y;
          doc
            .save()
            .rect(tX2, tY2, contentW, headH2)
            .fill(HEX.header)
            .restore();
          let rcx = tX2;
          for (const col of columns) {
            this.drawCenteredText(doc, col.title, rcx, tY2, col.w, headH2, {
              bold: true,
              color: HEX.white,
              size: 7,
              align: col.align,
            });
            rcx += col.w;
          }
          doc.rect(tX2, tY2, contentW, headH2).strokeColor(HEX.border).stroke();
          tY2 += headH2;
        }

        // título del factor
        const spanLeftW = columns.slice(0, 12).reduce((acc, c) => acc + c.w, 0);
        const spanRightW = contentW - spanLeftW;

        doc
          .save()
          .rect(tX2, tY2, spanLeftW, factorRowH)
          .fill(HEX.bgSoft)
          .restore();
        doc
          .save()
          .rect(tX2 + spanLeftW, tY2, spanRightW, factorRowH)
          .fill(HEX.bgSoft)
          .restore();
        doc
          .rect(tX2, tY2, contentW, factorRowH)
          .strokeColor(HEX.border)
          .stroke();
        doc
          .moveTo(tX2 + spanLeftW, tY2)
          .lineTo(tX2 + spanLeftW, tY2 + factorRowH)
          .strokeColor(HEX.border)
          .stroke();

        this.drawCenteredText(
          doc,
          `${i + 1}. ${safe(f.name)} `,
          tX2 + 6,
          tY2,
          spanLeftW - 12,
          factorRowH,
          {
            bold: true,
            size: 9,
            align: 'left',
          },
        );
        this.drawCenteredText(
          doc,
          `${factorProgress}%`,
          tX2 + spanLeftW,
          tY2,
          spanRightW,
          factorRowH,
          {
            bold: true,
            size: 9,
            align: 'center',
          },
        );
        tY2 += factorRowH;

        // TAREAS del factor
        for (let k = 0; k < tasks.length; k++) {
          const t = tasks[k];

          const nText = String(k + 1);
          const accion = safe(t.name);
          const just = safe(t.description);
          const ini = fmtDate(parseISO(t.fromAt));
          const fin = fmtDate(parseISO(t.untilAt));
          const ent = safe(t.result);
          const resp = participantMap.get(t.projectParticipantId) ?? '—';
          const met = safe(t.methodology);
          const apo = safe(t.props);
          const inv = safe(t.budget);
          const lim = safe(t.limitation);
          const obs = safe(t.comments);
          // Avance por regla que pediste: CLO -> 0%, OPE -> 100%
          const avc = (t.status ?? '').toUpperCase() === 'CLO' ? '100%' : '0%';

          // medir altura dinámica de la fila
          const pad = 6;
          const measureH = (txt: string, w: number) => {
            doc.save().font('Helvetica').fontSize(7);
            const h = doc.heightOfString(txt, { width: w - pad * 2 });
            doc.restore();
            return Math.max(22, h + pad * 2);
          };

          let rowH = 22;
          const values = [
            { txt: nText, w: columns[0].w },
            { txt: accion, w: columns[1].w },
            { txt: just, w: columns[2].w },
            { txt: ini, w: columns[3].w },
            { txt: fin, w: columns[4].w },
            { txt: ent, w: columns[5].w },
            { txt: resp, w: columns[6].w },
            { txt: met, w: columns[7].w },
            { txt: apo, w: columns[8].w },
            { txt: inv, w: columns[9].w },
            { txt: lim, w: columns[10].w },
            { txt: obs, w: columns[11].w },
            { txt: avc, w: columns[12].w },
          ];
          for (let c = 0; c < values.length; c++) {
            rowH = Math.max(rowH, measureH(values[c].txt, values[c].w));
          }

          if (tY2 + rowH > bottomSafe()) {
            doc.addPage({
              size: 'A4',
              layout: 'landscape',
              margins: {
                top: mm(14),
                bottom: mm(14),
                left: mm(12),
                right: mm(12),
              },
            });
            this.drawHeaderSkeleton(doc, contentW, logoImage);
            moveBelowHeader();
            tY2 = doc.y;
            // reimprimir header
            doc
              .save()
              .rect(tX2, tY2, contentW, headH2)
              .fill(HEX.header)
              .restore();
            let rcx = tX2;
            for (const col of columns) {
              this.drawCenteredText(doc, col.title, rcx, tY2, col.w, headH2, {
                bold: true,
                color: HEX.white,
                size: 7,
                align: col.align,
              });
              rcx += col.w;
            }
            doc
              .rect(tX2, tY2, contentW, headH2)
              .strokeColor(HEX.border)
              .stroke();
            tY2 += headH2;
          }

          // alternar fondo
          if (k % 2 === 1) {
            doc
              .save()
              .rect(tX2, tY2, contentW, rowH)
              .fill(HEX.rowAlt)
              .restore();
          }

          // pintar columnas
          let cx2 = tX2;
          const put = (
            txt: string,
            w: number,
            align: PDFKit.Mixins.TextOptions['align'],
            bold = false,
          ) => {
            this.drawCenteredText(doc, txt, cx2, tY2, w, rowH, {
              align,
              bold,
              size: 7,
            });
            cx2 += w;
          };

          put(nText, columns[0].w, 'center', true);
          put(accion, columns[1].w, 'left');
          put(just, columns[2].w, 'left');
          put(ini, columns[3].w, 'center');
          put(fin, columns[4].w, 'center');
          put(ent, columns[5].w, 'left');
          put(resp, columns[6].w, 'left');
          put(met, columns[7].w, 'left');
          put(apo, columns[8].w, 'left');
          put(inv, columns[9].w, 'center');
          put(lim, columns[10].w, 'left');
          put(obs, columns[11].w, 'left');
          put(avc, columns[12].w, 'center', true);

          drawRowBorders(tY2, rowH);
          tY2 += rowH;
        }

        // Subtotal de factor al final (12 cols texto, 1 col valor)
        const subtotalH = 20;
        if (tY2 + subtotalH > bottomSafe()) {
          doc.addPage({
            size: 'A4',
            layout: 'landscape',
            margins: {
              top: mm(14),
              bottom: mm(14),
              left: mm(12),
              right: mm(12),
            },
          });
          this.drawHeaderSkeleton(doc, contentW, logoImage);
          moveBelowHeader();
          tY2 = doc.y;
          // reimprimir header
          doc
            .save()
            .rect(tX2, tY2, contentW, headH2)
            .fill(HEX.header)
            .restore();
          let rcx = tX2;
          for (const col of columns) {
            this.drawCenteredText(doc, col.title, rcx, tY2, col.w, headH2, {
              bold: true,
              color: HEX.white,
              size: 7,
              align: col.align,
            });
            rcx += col.w;
          }
          doc.rect(tX2, tY2, contentW, headH2).strokeColor(HEX.border).stroke();
          tY2 += headH2;
        }

        const spanLeftW2 = columns
          .slice(0, 12)
          .reduce((acc, c) => acc + c.w, 0);
        const spanRightW2 = contentW - spanLeftW2;

        doc
          .save()
          .rect(tX2, tY2, spanLeftW2, subtotalH)
          .fill(HEX.bgSoft)
          .restore();
        doc
          .save()
          .rect(tX2 + spanLeftW2, tY2, spanRightW2, subtotalH)
          .fill(HEX.bgSoft)
          .restore();
        doc
          .rect(tX2, tY2, contentW, subtotalH)
          .strokeColor(HEX.border)
          .stroke();
        doc
          .moveTo(tX2 + spanLeftW2, tY2)
          .lineTo(tX2 + spanLeftW2, tY2 + subtotalH)
          .strokeColor(HEX.border)
          .stroke();

        this.drawCenteredText(
          doc,
          '% Cumplimiento',
          tX2 + 8,
          tY2,
          spanLeftW2 - 16,
          subtotalH,
          {
            bold: true,
            size: 9,
            align: 'right',
          },
        );
        this.drawCenteredText(
          doc,
          `${factorProgress}%`,
          tX2 + spanLeftW2,
          tY2,
          spanRightW2,
          subtotalH,
          {
            bold: true,
            size: 9,
            align: 'center',
          },
        );
        tY2 += subtotalH;
      }

      // === Firmas ===
      const drawSignatureRow = () => {
        const sx = doc.page.margins.left;
        let sy = doc.y;
        const h = 64;
        const w = contentW,
          half = w / 2,
          p = 8;

        if (sy + h > doc.page.height - doc.page.margins.bottom - FOOTER_ZONE) {
          doc.addPage({
            size: 'A4',
            layout: 'landscape',
            margins: {
              top: mm(14),
              bottom: mm(14),
              left: mm(12),
              right: mm(12),
            },
          });
          this.drawHeaderSkeleton(doc, contentW, logoImage);
          moveBelowHeader();
          sy = doc.y;
        }

        doc.rect(sx, sy, w, h).strokeColor(HEX.border).lineWidth(1).stroke();
        doc.rect(sx, sy, half, h).strokeColor(HEX.border).lineWidth(1).stroke();

        this.drawCenteredText(
          doc,
          `Revisado por: ${reviewerName}`,
          sx + p,
          sy,
          half - p * 2,
          h,
          {
            bold: true,
            size: 10,
            align: 'center',
          },
        );
        this.drawCenteredText(
          doc,
          reviewerPosition,
          sx + p,
          sy + 18,
          half - p * 2,
          h - 18,
          {
            size: 10,
            align: 'center',
          },
        );

        this.drawCenteredText(
          doc,
          `Aprobado por: ${approverName}`,
          sx + half + p,
          sy,
          half - p * 2,
          h,
          {
            bold: true,
            size: 10,
            align: 'center',
          },
        );
        this.drawCenteredText(
          doc,
          approverPosition,
          sx + half + p,
          sy + 18,
          half - p * 2,
          h - 18,
          {
            size: 10,
            align: 'center',
          },
        );

        doc.y = sy + h;
      };

      doc.moveDown(0.6);
      drawSignatureRow();

      // Paginación+footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        this.drawHeaderTexts(
          doc,
          contentW,
          now,
          i - range.start + 1,
          range.count,
        );
        this.drawFooter(doc, contentW);
      }

      doc.end();
    });
  }
}
