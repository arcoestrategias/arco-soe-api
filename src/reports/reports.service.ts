import { Injectable } from '@nestjs/common';
import { DefinitionsReportDto } from './dto/definitions-report.dto';
import { PermissionValidatorService } from 'src/core/services/permission-validator.service';
import PDFDocument = require('pdfkit');
import type * as PDFKit from 'pdfkit';
import { PositionsRepository } from 'src/position/repositories/positions.repository';
import { FilesService } from 'src/files/files.service';
import * as fs from 'fs';
import * as path from 'path';
import { BusinessUnitsRepository } from 'src/business-unit/repositories/business-units.repository';

// ====== Paleta / constantes visuales ======
const HEX = {
  header: '#0F274A', // azul header/sections
  subheader: '#1F3866', // PRESENTE / FUTURO
  border: '#CDD6E1', // borde tablas
  bgSoft: '#F3F6FB', // fondo suave
  white: '#FFFFFF',
  black: '#000000',
};

const FOOTER_ZONE = 18;

function mm(v: number) {
  return (v / 25.4) * 72;
} // mm → pt
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

type Rect = { x: number; y: number; w: number; h: number };

// ========= Helpers internos (logo) =========
async function resolveLogoBuffer(
  filesService: FilesService,
  companyId: string,
): Promise<Buffer | null> {
  try {
    // Ajusta si tu FilesService expone otro método/args:
    // list(type: 'logo' | string, referenceId: string)
    const list = await (filesService as any).list?.('logo', companyId);
    if (!Array.isArray(list) || list.length === 0) return null;

    // Tomar el más reciente (updatedAt || createdAt)
    const sorted = [...list].sort((a, b) => {
      const ad = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bd = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bd - ad;
    });
    const file = sorted[0];

    // Preferir file.path si existe; si no, construir en uploads/images/<fileName>
    const abs = file?.path
      ? path.isAbsolute(file.path)
        ? file.path
        : path.join(process.cwd(), file.path)
      : path.join(process.cwd(), 'uploads', 'images', file.fileName);

    if (!fs.existsSync(abs)) return null;
    return await fs.promises.readFile(abs);
  } catch {
    return null;
  }
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly positionsRepo: PositionsRepository,
    private readonly filesService: FilesService,
    private readonly businessUnitsRepo: BusinessUnitsRepository,
  ) {}

  async generateDefinitionsPdf(dto: DefinitionsReportDto): Promise<Buffer> {
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

    // 2) Datos desde repos
    const now = new Date();
    const version = '0.1v';

    // 2.1 Logo
    const logoImage: Buffer | null = await resolveLogoBuffer(
      this.filesService,
      companyId,
    );

    // 2.2 Firmas (CEO / Especialista)
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

    // 3) PDF apaisado + paginación total
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

    // Header layout
    const HEADER_H = mm(28);
    const COL_L = contentW * 0.22;
    const COL_C = contentW * 0.56;
    const COL_R = contentW * 0.22;

    const moveBelowHeader = () => {
      doc.x = doc.page.margins.left;
      doc.y = doc.page.margins.top + HEADER_H + 10;
    };

    // Header (fase 1): skeleton
    const drawHeaderSkeleton = () => {
      const x = doc.page.margins.left;
      const y = doc.page.margins.top;

      // Fondo suave
      doc.save().rect(x, y, contentW, HEADER_H).fill(HEX.bgSoft).restore();

      // Separador
      doc
        .moveTo(x, y + HEADER_H + 2)
        .lineTo(x + contentW, y + HEADER_H + 2)
        .strokeColor(HEX.border)
        .lineWidth(1)
        .stroke();

      // Logo box
      const padBox = 6;
      const box: Rect = {
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
          doc
            .fontSize(8)
            .fillColor(HEX.black)
            .text('—', box.x, box.y + box.h / 2 - 4, {
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
        .text('DEFINICIONES ESTRATÉGICAS', x + COL_L, y + HEADER_H / 2 - 10, {
          width: COL_C,
          align: 'center',
        })
        .restore();

      // Caja derecha (3 filas)
      const rp = 6,
        rw = COL_R - rp * 2,
        ry = y + rp;
      const cellH = 16;
      for (let i = 0; i < 3; i++) {
        doc
          .rect(x + COL_L + COL_C + rp, ry + i * cellH, rw, cellH)
          .strokeColor(HEX.border)
          .lineWidth(1)
          .stroke();
      }
    };

    // Header (fase 2): textos (al final, por página)
    const drawHeaderTexts = (page: number, total: number) => {
      const x = doc.page.margins.left;
      const y = doc.page.margins.top;

      const rp = 6;
      const rx = x + COL_L + COL_C + rp;
      const ry = y + rp;
      const rw = COL_R - rp * 2;
      const cellH = 16;

      // Limpiar área
      doc
        .save()
        .rect(rx + 1, ry + 1, rw - 2, cellH * 3 - 2)
        .fill(HEX.white)
        .restore();

      doc.fontSize(9).fillColor(HEX.black);
      doc
        .font('Helvetica-Bold')
        .text('Versión: ', rx + 4, ry + 3, { continued: true });
      doc.font('Helvetica').text(version, { lineBreak: false });

      doc
        .font('Helvetica-Bold')
        .text('Fecha impresión: ', rx + 4, ry + 3 + cellH, { continued: true });
      doc.font('Helvetica').text(fmtDate(now), { lineBreak: false });

      const pageText = `Página ${page} de ${total}`;
      doc
        .font('Helvetica-Bold')
        .text(pageText, rx + 4, ry + 3 + cellH * 2, { lineBreak: false });
    };

    // Footer
    const drawFooterCopyright = () => {
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

    // =================== Bloques de dibujo ===================
    const drawLabeledRow = (
      r: Rect,
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
      doc
        .fillColor(HEX.black)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(label, r.x + 6, r.y + 4, { width: labelW - 8 });
      doc
        .font('Helvetica')
        .text(value, r.x + labelW + 6, r.y + 4, { width: valueW - 12 });
    };

    const drawPlanMetadata = () => {
      const x = doc.page.margins.left;
      let y = doc.y;
      const rowH = 18;
      const labelW = contentW * 0.22;

      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Plan estratégico:',
        safe(dto?.strategicPlan?.name),
        labelW,
      );
      y += rowH;
      const pStart = fmtDate(parseISO(dto?.strategicPlan?.periodStart));
      const pEnd = fmtDate(parseISO(dto?.strategicPlan?.periodEnd));
      drawLabeledRow(
        { x, y, w: contentW, h: rowH },
        'Periodo:',
        `${pStart} - ${pEnd}`,
        labelW,
      );
      doc.y = y + rowH + 6;
    };

    const drawSectionBar = (
      title: string,
      align: 'left' | 'center' = 'left',
    ) => {
      const x = doc.page.margins.left;
      const y = doc.y;
      const h = 18;
      doc.save().rect(x, y, contentW, h).fill(HEX.header).restore();
      doc
        .fillColor(HEX.white)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(title, x + 8, y + 3, { width: contentW - 16, align });
      doc.y = y + h;
    };

    const drawNumberedList = (items: string[]) => {
      const x = doc.page.margins.left;
      doc.moveDown(0.4);
      if (!items.length) {
        doc
          .fillColor(HEX.black)
          .font('Helvetica')
          .fontSize(9)
          .text('(Sin elementos)', x, doc.y, { width: contentW });
        return;
      }
      items.forEach((t, i) => {
        ensureSpace(16);
        doc
          .fillColor(HEX.black)
          .font('Helvetica')
          .fontSize(10)
          .text(`${i + 1}.- ${t}`, x, doc.y, { width: contentW });
      });
    };

    const drawPresentFutureMatrix = () => {
      const x = doc.page.margins.left;
      let y = doc.y;

      const colW = [
        contentW * 0.34,
        contentW * 0.3,
        contentW * 0.18,
        contentW * 0.18,
      ];
      const xCol = [
        x,
        x + colW[0],
        x + colW[0] + colW[1],
        x + colW[0] + colW[1] + colW[2],
      ];

      // Sub-encabezados
      const subH = 18;
      doc
        .save()
        .rect(x, y, colW[0] + colW[1], subH)
        .fill(HEX.subheader)
        .restore();
      doc
        .fillColor(HEX.white)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PRESENTE', x, y + 4, {
          width: colW[0] + colW[1],
          align: 'center',
        });

      doc
        .save()
        .rect(x + colW[0] + colW[1], y, colW[2] + colW[3], subH)
        .fill(HEX.subheader)
        .restore();
      doc
        .fillColor(HEX.white)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('FUTURO', x + colW[0] + colW[1], y + 4, {
          width: colW[2] + colW[3],
          align: 'center',
        });

      y += subH;

      // Títulos
      const titleH = 20;
      const titles = [
        'MISIÓN',
        'FACTORES CLAVES DE ÉXITO',
        'VENTAJA COMPETITIVA',
        'VISIÓN',
      ];
      for (let i = 0; i < 4; i++) {
        doc
          .rect(xCol[i], y, colW[i], titleH)
          .fillAndStroke(HEX.header, HEX.border);
        doc
          .fillColor(HEX.white)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(titles[i], xCol[i] + 4, y + 4, {
            width: colW[i] - 8,
            align: 'center',
          });
      }
      y += titleH;

      const padX = 8,
        padY = 8;
      const startY = y;
      let maxY = y;

      // MISIÓN
      doc.fillColor(HEX.black).font('Helvetica').fontSize(10);
      doc.text(
        `“${safe(dto?.strategicPlan?.mission)}”`,
        xCol[0] + padX,
        y + padY,
        { width: colW[0] - padX * 2, align: 'justify' },
      );
      maxY = Math.max(maxY, doc.y + padY);

      // FACTORES
      doc.text('', xCol[1] + padX, y + padY);
      const factors = (dto?.successFactors ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((f) => f?.name || '—');
      if (factors.length) {
        factors.forEach((t, i) => {
          doc.text(`${i + 1}.- ${t}`, xCol[1] + padX, doc.y, {
            width: colW[1] - padX * 2,
          });
        });
      } else {
        doc.text('(Sin elementos)', xCol[1] + padX, y + padY, {
          width: colW[1] - padX * 2,
        });
      }
      maxY = Math.max(maxY, doc.y + padY);

      // VENTAJA COMPETITIVA
      doc.text('', xCol[2] + padX, y + padY);
      doc.text(
        safe(dto?.strategicPlan?.competitiveAdvantage),
        xCol[2] + padX,
        y + padY,
        { width: colW[2] - padX * 2, align: 'justify' },
      );
      maxY = Math.max(maxY, doc.y + padY);

      // VISIÓN
      doc.text('', xCol[3] + padX, y + padY);
      doc.text(
        `“${safe(dto?.strategicPlan?.vision)}”`,
        xCol[3] + padX,
        y + padY,
        { width: colW[3] - padX * 2, align: 'justify' },
      );
      maxY = Math.max(maxY, doc.y + padY);

      // Marco
      const cellH = maxY - startY + padY;
      for (let i = 0; i < 4; i++) {
        doc
          .rect(xCol[i], startY, colW[i], cellH)
          .strokeColor(HEX.border)
          .lineWidth(1)
          .stroke();
      }

      doc.y = startY + cellH + 6;
    };

    const drawSignatureRow = () => {
      const x = doc.page.margins.left;
      let y = doc.y;
      const h = 64;
      const w = contentW,
        half = w / 2;
      const p = 8;

      doc.rect(x, y, w, h).strokeColor(HEX.border).lineWidth(1).stroke();
      doc.rect(x, y, half, h).strokeColor(HEX.border).lineWidth(1).stroke();

      // Izquierda (Revisado)
      let bx = x,
        bw = half;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Revisado por: ${reviewerName}`, bx + p, y + p + 8, {
          width: bw - p * 2,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(reviewerPosition, bx + p, y + p + 26, {
          width: bw - p * 2,
          align: 'center',
        });

      // Derecha (Aprobado)
      bx = x + half;
      bw = half;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Aprobado por: ${approverName}`, bx + p, y + p + 8, {
          width: bw - p * 2,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(approverPosition, bx + p, y + p + 26, {
          width: bw - p * 2,
          align: 'center',
        });

      doc.y = y + h;
    };

    // =================== Stream ===================
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Página 1
      drawHeaderSkeleton();
      moveBelowHeader();

      // 4.2 Metadatos
      drawPlanMetadata();

      // 4.3 Matriz principal
      drawPresentFutureMatrix();

      // 4.4 Valores
      drawSectionBar('VALORES CORPORATIVOS');
      const values = (dto?.strategicValues ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((v) => v?.name || '—');
      drawNumberedList(values);

      // 4.5 Metas anuales
      drawSectionBar('METAS ESTRATÉGICAS ANUALES');
      const goals = (dto?.objectives ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((o) => o?.name || '—');
      drawNumberedList(goals);

      // 4.6 Lo clave por hacer (solo franja)
      drawSectionBar('LO CLAVE POR HACER', 'center');

      // 4.7 Proyectos
      drawSectionBar('PROYECTOS ESTRATÉGICOS');
      const projs = (dto?.strategicProjects ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((p) => p?.name || '—');
      drawNumberedList(projs);

      // 4.8 Firmas (aseguramos espacio)
      const FOOTER_SAFE = 84; // ~64 + margen
      ensureSpace(FOOTER_SAFE);
      doc.moveDown(0.4);
      drawSignatureRow();

      // Paginación + footer por página
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawHeaderTexts(i - range.start + 1, range.count);
        drawFooterCopyright();
      }

      doc.end();
    });
  }
}
