// src/reports/reports-priorities.service.ts
import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import type * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

import { PrioritiesReportDto } from './dto/priorities-report.dto';
import { FilesService } from 'src/files/files.service';
import { PositionsRepository } from 'src/position/repositories/positions.repository';
import { CommentsRepository } from 'src/comments/repository/comments.repository';
import { BusinessUnitsRepository } from 'src/business-unit/repositories/business-units.repository';

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
function parseISO(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function safe(v: any, fb = '—') {
  if ((v ?? '') === '' || v == null) return fb;
  return String(v).trim();
}
function formatNoteLine(d: Date, text: string) {
  return `${fmtDate(d)}: ${text}`;
}
function monthNameEs(m: number) {
  const arr = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return arr[(m - 1) % 12] ?? '';
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
export class ReportsPrioritiesService {
  constructor(
    private readonly filesService: FilesService,
    private readonly positionsRepo: PositionsRepository,
    private readonly businessUnitsRepo: BusinessUnitsRepository,
    private readonly commentsRepo: CommentsRepository,
  ) {}

  async generatePdf(dto: PrioritiesReportDto): Promise<Buffer> {
    // 1) Resolver companyId (si no viene en dto)
    let companyId: string | null | undefined = dto.companyId;
    if (!companyId && dto.businessUnitId) {
      companyId = await this.businessUnitsRepo.findCompanyIdByBusinessUnit(
        dto.businessUnitId,
      );
    }
    if (!companyId) {
      throw new Error('No se pudo determinar el companyId');
    }

    // 1) Datos back
    const now = new Date();
    const logoImage = await resolveLogoBuffer(this.filesService, companyId);

    // Datos de la posición y usuario
    const positionPerson =
      await this.positionsRepo.findUserRolePositionByCompanyBUPosition(
        companyId,
        dto.businessUnitId,
        dto.positionId,
      );

    // Datos Firmas (CEO / Especialista)
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

    // 2) PDF (horizontal)
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

    const HEADER_H = mm(28);
    const COL_L = contentW * 0.22;
    const COL_C = contentW * 0.56;
    const COL_R = contentW * 0.22;

    const moveBelowHeader = () => {
      doc.x = doc.page.margins.left;
      doc.y = doc.page.margins.top + HEADER_H + 10;
    };

    const drawHeaderSkeleton = () => {
      const x = doc.page.margins.left;
      const y = doc.page.margins.top;

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

      // Título del reporte
      doc
        .save()
        .fillColor(HEX.header)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('MATRIZ DE PRIORIDADES', x + COL_L, y + HEADER_H / 2 - 10, {
          width: COL_C,
          align: 'center',
        })
        .restore();

      // Caja derecha (versión / fecha / página)
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
    };

    const drawHeaderTexts = (page: number, total: number) => {
      const x = doc.page.margins.left;
      const y = doc.page.margins.top;
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
    };

    const drawFooter = () => {
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
    };

    // 1) Ordenar filas
    const rows = (dto.priorities ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    // 2) Traer notas en paralelo y formatearlas
    const notesMap = new Map<string, string>(); // priorityId -> texto

    await Promise.all(
      rows.map(async (r) => {
        try {
          // Si usas shortcode para prioridades, pásalo como segundo parámetro (p.ej. 'PRIORITY')
          const comments = await this.commentsRepo.findByTarget(
            r.id /*, 'PRIORITY'*/,
          );

          if (!comments.length) {
            notesMap.set(r.id, ' - ');
            return;
          }

          const text = comments
            .map((c) => formatNoteLine(c.createdAt, c.name ?? ''))
            .join('\n');

          notesMap.set(r.id, text || ' - ');
        } catch {
          notesMap.set(r.id, ' - ');
        }
      }),
    );

    const ensureSpace = (needed: number) => {
      const bottomSafe =
        doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;
      if (doc.y + needed <= bottomSafe) return;
      doc.addPage({
        size: 'A4',
        layout: 'landscape',
        margins: { top: mm(14), bottom: mm(14), left: mm(12), right: mm(12) },
      });
      drawHeaderSkeleton();
      moveBelowHeader();
    };

    // === Helper: texto centrado verticalmente (y alineación configurable)
    type TextOpts = {
      bold?: boolean;
      size?: number;
      color?: string;
      align?: PDFKit.Mixins.TextOptions['align'];
    };
    const drawCenteredText = (
      text: string,
      x: number,
      y: number,
      w: number,
      h: number,
      opts: TextOpts = {},
    ) => {
      const {
        bold = false,
        size = 9,
        color = HEX.black,
        align = 'left',
      } = opts;
      doc.save();
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(size)
        .fillColor(color);
      const th = doc.heightOfString(text, { width: w - 2, align });
      const y0 = y + Math.max(0, (h - th) / 2);
      doc.text(text, x + 1, y0, { width: w - 2, align });
      doc.restore();
    };

    const drawLabeledRow = (
      r: { x: number; y: number; w: number; h: number },
      label: string,
      value: string,
      labelW: number,
    ) => {
      const valueW = r.w - labelW;
      doc.save().rect(r.x, r.y, r.w, r.h).fill(HEX.bgSoft).restore();
      doc
        .rect(r.x, r.y, r.w, r.h)
        .strokeColor(HEX.border)
        .lineWidth(1)
        .stroke();
      drawCenteredText(label, r.x + 4, r.y, labelW - 8, r.h, {
        bold: true,
        size: 10,
      });
      drawCenteredText(value, r.x + labelW + 6, r.y, valueW - 12, r.h, {
        size: 10,
      });
    };

    // ======= Render =======
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      drawHeaderSkeleton();
      moveBelowHeader();

      // Metadatos principales
      const x = doc.page.margins.left;
      let y = doc.y;
      const rowH = 18;
      const labelW = contentW * 0.22;

      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Plan estratégico:',
        dto.strategicPlan?.name ?? '—',
        labelW,
      );
      y += rowH;
      const pStart = fmtDate(parseISO(dto.strategicPlan?.periodStart));
      const pEnd = fmtDate(parseISO(dto.strategicPlan?.periodEnd));
      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Periodo:',
        `${pStart} - ${pEnd}`,
        labelW,
      );
      y += rowH;
      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Posición:',
        positionPerson?.namePosition ?? '—',
        labelW,
      );
      y += rowH;
      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Nombre:',
        positionPerson?.nameUser ?? '—',
        labelW,
      );
      y += rowH;
      const filtroMes = monthNameEs(dto.icp?.month ?? 0);
      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Filtro:',
        filtroMes || '—',
        labelW,
      );
      doc.y = y + rowH + 8;

      // Tabla de prioridades (anchos exactos = 100%)
      const tableCols = [
        {
          key: 'n',
          title: 'N°',
          w: contentW * 0.025,
          align: 'center' as const,
        },
        {
          key: 'name',
          title: 'Prioridad',
          w: contentW * 0.195,
          align: 'left' as const,
        },
        {
          key: 'objectiveName',
          title: 'Objetivo al que impacta',
          w: contentW * 0.17,
          align: 'left' as const,
        },
        {
          key: 'description',
          title: 'Resultado',
          w: contentW * 0.165,
          align: 'left' as const,
        },
        {
          key: 'fromAt',
          title: 'Fecha acuerdo',
          w: contentW * 0.08,
          align: 'center' as const,
        },
        {
          key: 'untilAt',
          title: 'Fecha compromiso',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'finishedAt',
          title: 'Fecha culminación',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'progress',
          title: 'Progreso',
          w: contentW * 0.09,
          align: 'center' as const,
        },
        {
          key: 'notes',
          title: 'Notas',
          w: contentW * 0.09,
          align: 'left' as const,
        },
      ];

      const tX = doc.page.margins.left;
      let tY = doc.y;
      const headH = 26;

      // Header de la tabla
      doc.save().rect(tX, tY, contentW, headH).fill(HEX.header).restore();
      let cx = tX;
      tableCols.forEach((col) => {
        drawCenteredText(col.title, cx, tY, col.w, headH, {
          bold: true,
          color: HEX.white,
          size: 9,
          align: col.align,
        });
        cx += col.w;
      });
      doc.rect(tX, tY, contentW, headH).strokeColor(HEX.border).stroke();
      tY += headH;

      const bodyRowH = 28;
      const bottomSafe = () =>
        doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;

      const drawRowBorders = (y0: number, rowH: number) => {
        doc
          .rect(tX, y0, contentW, rowH)
          .strokeColor(HEX.border)
          .lineWidth(1)
          .stroke();
        // líneas verticales
        let vx = tX;
        tableCols.forEach((col) => {
          doc
            .moveTo(vx, y0)
            .lineTo(vx, y0 + rowH)
            .strokeColor(HEX.border)
            .stroke();
          vx += col.w;
        });
        doc
          .moveTo(tX + contentW, y0)
          .lineTo(tX + contentW, y0 + rowH)
          .strokeColor(HEX.border)
          .stroke();
      };

      const rows = (dto.priorities ?? []).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const isCanceled =
          !!r.canceledAt ||
          (r.status ?? '').toUpperCase() === 'CAN' ||
          /anulad/i.test(r.monthlyClass || '');

        // Calcular alturas
        const paddX = 6,
          paddY = 4;
        let rowH = bodyRowH;

        const measure = (
          text: string,
          w: number,
          fontBold = false,
          size = 9,
        ) => {
          doc
            .save()
            .font(fontBold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(size);
          const h = doc.heightOfString(text, { width: w - paddX * 2 });
          doc.restore();
          return Math.max(h + paddY * 2, bodyRowH);
        };

        const nText = String(r.order ?? i + 1);
        const nameTx = safe(r.name, ' - ');
        const objTx = safe(r.objectiveName, ' - ');
        const descTx = safe(r.description, ' - ');
        const fromTx = fmtDate(parseISO(r.fromAt));
        const untilTx = fmtDate(parseISO(r.untilAt));
        const finTx = r.finishedAt ? fmtDate(parseISO(r.finishedAt)) : ' - ';
        const progMain = isCanceled ? ' - ' : r.compliance || ' - ';
        const progLabel = isCanceled ? '' : r.monthlyClass || '';
        const progTx = progLabel ? `${progMain} ${progLabel}` : progMain;
        const notesTx = notesMap.get(r.id) ?? ' - ';

        // Medición de dos líneas en bold, mismo ancho (con paddings)
        const measureProg = () => {
          const w = tableCols[7].w - paddX * 2;
          doc.save().font('Helvetica-Bold').fontSize(9);
          const h1 = doc.heightOfString(progMain, {
            width: w,
            align: 'center',
          });
          const h2 = progLabel
            ? doc.heightOfString(progLabel, { width: w, align: 'center' })
            : 0;
          doc.restore();
          // +paddY*2 para respiración total
          return Math.max(h1 + h2 + paddY * 2, bodyRowH);
        };

        rowH = Math.max(rowH, measure(nText, tableCols[0].w, true));
        rowH = Math.max(rowH, measure(nameTx, tableCols[1].w, true));
        rowH = Math.max(rowH, measure(objTx, tableCols[2].w));
        rowH = Math.max(rowH, measure(descTx, tableCols[3].w));
        rowH = Math.max(rowH, measure(fromTx, tableCols[4].w));
        rowH = Math.max(rowH, measure(untilTx, tableCols[5].w));
        rowH = Math.max(rowH, measure(finTx, tableCols[6].w));
        rowH = Math.max(rowH, measureProg());
        rowH = Math.max(rowH, measure(notesTx, tableCols[8].w, false, 5)); // notas 4pt menos

        // Salto de página si no cabe
        if (tY + rowH > bottomSafe()) {
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
          drawHeaderSkeleton();
          moveBelowHeader();
          tY = doc.y;
          // reimprimir header
          doc.save().rect(tX, tY, contentW, headH).fill(HEX.header).restore();
          let rcx = tX;
          tableCols.forEach((col) => {
            drawCenteredText(col.title, rcx, tY, col.w, headH, {
              bold: true,
              color: HEX.white,
              size: 9,
              align: col.align,
            });
            rcx += col.w;
          });
          doc.rect(tX, tY, contentW, headH).strokeColor(HEX.border).stroke();
          tY += headH;
        }

        // Alternar fondo fila
        if (i % 2 === 1) {
          doc.save().rect(tX, tY, contentW, rowH).fill(HEX.rowAlt).restore();
        }

        // Render fila
        let cx2 = tX;

        // N°
        drawCenteredText(nText, cx2, tY, tableCols[0].w, rowH, {
          bold: true,
          align: 'center',
        });
        cx2 += tableCols[0].w;

        // Prioridad
        drawCenteredText(nameTx, cx2, tY, tableCols[1].w, rowH, {
          align: 'left',
        });
        cx2 += tableCols[1].w;

        // Objetivo
        drawCenteredText(objTx, cx2, tY, tableCols[2].w, rowH, {
          align: 'left',
        });
        cx2 += tableCols[2].w;

        // Resultado
        drawCenteredText(descTx, cx2, tY, tableCols[3].w, rowH, {
          align: 'left',
        });
        cx2 += tableCols[3].w;

        // Fechas
        drawCenteredText(fromTx, cx2, tY, tableCols[4].w, rowH, {
          align: 'center',
        });
        cx2 += tableCols[4].w;
        drawCenteredText(untilTx, cx2, tY, tableCols[5].w, rowH, {
          align: 'center',
        });
        cx2 += tableCols[5].w;
        drawCenteredText(finTx, cx2, tY, tableCols[6].w, rowH, {
          align: 'center',
        });
        cx2 += tableCols[6].w;

        // Progreso (background + dos líneas)
        const bg = r.monthlyClassStyle?.backgroundColor || '#FFFFFF';
        const fg = r.monthlyClassStyle?.color || '#000000';

        // caja interna (no roza bordes)
        const progX = cx2 + 3;
        const progY = tY + 3;
        const progW = tableCols[7].w - 6;
        const progH = rowH - 6;

        doc.save().rect(progX, progY, progW, progH).fill(bg).restore();

        // Calcula alto de cada línea para centrar el stack completo
        doc.save().font('Helvetica-Bold').fontSize(9);
        const h1 = doc.heightOfString(progMain, {
          width: progW - 2,
          align: 'center',
        });
        const h2 = progLabel
          ? doc.heightOfString(progLabel, { width: progW - 2, align: 'center' })
          : 0;
        doc.restore();

        const stackH = h1 + (progLabel ? h2 : 0);
        const startY = progY + Math.max(0, (progH - stackH) / 2);

        // Línea 1: %
        drawCenteredText(progMain, progX, startY, progW, h1, {
          bold: true,
          size: 9,
          color: fg,
          align: 'center',
        });

        // Línea 2: etiqueta (solo si existe y no está anulada)
        if (progLabel && !isCanceled) {
          drawCenteredText(progLabel, progX, startY + h1, progW, progH - h1, {
            bold: true,
            size: 9,
            color: fg,
            align: 'center',
          });
        }

        cx2 += tableCols[7].w;

        // Notas (fuente 5pt)
        drawCenteredText(notesTx, cx2, tY, tableCols[8].w, rowH, {
          size: 5,
          align: 'left',
        });
        cx2 += tableCols[8].w;

        // Bordes
        drawRowBorders(tY, rowH);
        tY += rowH;
      }

      // --- Fila final: % Cumplimiento (span 7 cols a la izquierda) ---
      const rowH2 = 22;
      const sumWidth = (toExclusive: number) =>
        tableCols.slice(0, toExclusive).reduce((acc, c) => acc + c.w, 0);

      if (
        tY + rowH2 >
        doc.page.height - doc.page.margins.bottom - FOOTER_ZONE
      ) {
        doc.addPage({
          size: 'A4',
          layout: 'landscape',
          margins: { top: mm(14), bottom: mm(14), left: mm(12), right: mm(12) },
        });
        drawHeaderSkeleton();
        moveBelowHeader();
        tY = doc.y;
        // reimprime header de tabla
        doc.save().rect(tX, tY, contentW, headH).fill(HEX.header).restore();
        let rcx = tX;
        tableCols.forEach((col) => {
          drawCenteredText(col.title, rcx, tY, col.w, headH, {
            bold: true,
            color: HEX.white,
            size: 9,
            align: col.align,
          });
          rcx += col.w;
        });
        doc.rect(tX, tY, contentW, headH).strokeColor(HEX.border).stroke();
        tY += headH;
      }

      const leftW = sumWidth(7); // cols 0..6
      const rightW = contentW - leftW; // cols 7..8

      doc.save().rect(tX, tY, leftW, rowH2).fill(HEX.bgSoft).restore();
      doc
        .save()
        .rect(tX + leftW, tY, rightW, rowH2)
        .fill(HEX.bgSoft)
        .restore();
      doc.rect(tX, tY, contentW, rowH2).strokeColor(HEX.border).stroke();
      doc
        .moveTo(tX + leftW, tY)
        .lineTo(tX + leftW, tY + rowH2)
        .strokeColor(HEX.border)
        .stroke();

      drawCenteredText('% Cumplimiento', tX + 8, tY, leftW - 16, rowH2, {
        bold: true,
        size: 10,
        align: 'right',
      });
      drawCenteredText(
        `${String(dto.icp?.icp ?? 0)}%`,
        tX + leftW,
        tY,
        rightW,
        rowH2,
        { bold: true, size: 12, align: 'center' },
      );
      tY += rowH2;

      // Firmas
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
          drawHeaderSkeleton();
          moveBelowHeader();
          sy = doc.y;
        }

        doc.rect(sx, sy, w, h).strokeColor(HEX.border).lineWidth(1).stroke();
        doc.rect(sx, sy, half, h).strokeColor(HEX.border).lineWidth(1).stroke();

        drawCenteredText(
          `Revisado por: ${reviewerName}`,
          sx + p,
          sy,
          half - p * 2,
          h,
          { bold: true, size: 10, align: 'center' },
        );
        drawCenteredText(
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

        drawCenteredText(
          `Aprobado por: ${approverName}`,
          sx + half + p,
          sy,
          half - p * 2,
          h,
          { bold: true, size: 10, align: 'center' },
        );
        drawCenteredText(
          approverPosition,
          sx + half + p,
          sy + 18,
          half - p * 2,
          h - 18,
          { size: 10, align: 'center' },
        );

        doc.y = sy + h;
      };

      doc.y = tY + 8;
      drawSignatureRow();

      // Paginación + footer por página
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
