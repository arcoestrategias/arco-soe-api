import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PriorityRepository } from './repositories/priority.repository';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { FilterPriorityDto } from './dto/filter-priority.dto';
import { ResponsePriorityDto } from './dto/response-priority.dto';
import { PriorityEntity } from './entities/priority.entity';
import { PriorityStatus, MonthlyClass } from './types/priority.types';
import {
  CalculatePriorityIcpDto,
  ListPriorityResponseDto,
  ResponsePriorityIcpDto,
} from './dto';

@Injectable()
export class PriorityService {
  constructor(private readonly repo: PriorityRepository) {}

  // -------- CRUD --------

  async create(
    dto: CreatePriorityDto,
    userId: string,
  ): Promise<ResponsePriorityDto> {
    // Completar month/year si faltan, tomados de untilAt
    if (!dto.month || !dto.year) {
      const u = new Date(dto.untilAt);
      dto.month = dto.month ?? u.getUTCMonth() + 1;
      dto.year = dto.year ?? u.getUTCFullYear();
    }
    const created = await this.repo.create(dto, userId);
    const withClass = this.withMonthlyClass(created, dto.month, dto.year);
    return new ResponsePriorityDto(withClass);
  }

  async update(
    id: string,
    dto: UpdatePriorityDto,
    userId: string,
  ): Promise<ResponsePriorityDto> {
    if (dto.untilAt && (!dto.month || !dto.year)) {
      const u = new Date(dto.untilAt);
      dto.month = dto.month ?? u.getUTCMonth() + 1;
      dto.year = dto.year ?? u.getUTCFullYear();
    }
    const updated = await this.repo.update(id, dto, userId);
    const withClass = this.withMonthlyClass(updated, dto.month, dto.year);
    return new ResponsePriorityDto(withClass);
  }

  async findById(
    id: string,
    q?: { month?: number; year?: number; now?: Date },
  ): Promise<ResponsePriorityDto> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Priority not found');
    return new ResponsePriorityDto(
      this.withMonthlyClass(item, q?.month, q?.year, q?.now),
    );
  }

  async list(
    f: FilterPriorityDto & { now?: Date },
  ): Promise<ListPriorityResponseDto> {
    const page = f.page ?? 1;
    const limit = f.limit ?? 10;

    // Si NO hay período, comportamiento actual (lista por mes/año si te lo pasan, o todo)
    if (!f.month || !f.year) {
      const { items, total } = await this.repo.list({ ...f, page, limit });
      const mapped = items.map((e) =>
        this.withMonthlyClass(e, f.month, f.year, f?.now),
      );
      return {
        items: mapped.map((e) => new ResponsePriorityDto(e)),
        total,
        page,
        limit,
        icp: undefined,
      };
    }

    // ====== con período: traemos cada bucket como hace el ICP ======
    const q = {
      month: f.month,
      year: f.year,
      positionId: f.positionId,
      objectiveId: f.objectiveId,
    };

    const [
      openPrev, // OPE untilAt < start(M)
      openInMonth, // OPE untilAt ∈ M
      closedInMonth, // CLO finishedAt ∈ M
      canceledInMonth, // CAN canceledAt ∈ M
      completedInOtherMonth, // CLO untilAt ∈ M, finishedAt > end(M)
    ] = await Promise.all([
      this.repo.listOpenPreviousMonthsFull(q),
      this.repo.listOpenInMonthFull(q),
      this.repo.listClosedInMonthFull(q),
      this.repo.listCanceledInMonthFull(q),
      this.repo.listCompletedInOtherMonthFull(q),
    ]);

    // Clasificar cerradas en el mes en: onTime / late / prevMonths
    const completedOnTime: PriorityEntity[] = [];
    const completedLate: PriorityEntity[] = [];
    const completedPreviousMonths: PriorityEntity[] = [];

    for (const r of closedInMonth) {
      if (!r.untilAt || !r.finishedAt) continue;
      const fin = this.onlyDate(r.finishedAt);
      const lim = this.onlyDate(r.untilAt);

      const limInThisMonth =
        lim.getUTCFullYear() === f.year && lim.getUTCMonth() + 1 === f.month;
      const limBeforeThisMonth = this.isBeforePeriod(lim, {
        month: f.month,
        year: f.year,
      });

      if (limInThisMonth) {
        if (fin <= lim) completedOnTime.push(r);
        else completedLate.push(r);
      } else if (limBeforeThisMonth) {
        completedPreviousMonths.push(r);
      }
    }

    // OPE del mes -> inProgress vs overdue, con tu regla (futuro: todo inProgress)
    const now = f?.now ?? new Date();
    const targetIdx = f.year * 12 + (f.month - 1);
    const currentIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();

    const inProgress: PriorityEntity[] = [];
    const notCompletedOverdue: PriorityEntity[] = [];

    if (targetIdx > currentIdx) {
      inProgress.push(...openInMonth);
    } else {
      const ref =
        targetIdx < currentIdx
          ? this.periodEnd({ month: f.month, year: f.year })
          : this.onlyDate(now);
      for (const r of openInMonth) {
        const lim = this.onlyDate(r.untilAt);
        if (lim < ref) notCompletedOverdue.push(r);
        else inProgress.push(r);
      }
    }

    // Mapear monthlyClass + compliance por item
    const tag = (
      e: PriorityEntity,
      mc: string,
      compliance: '0%' | '100%' | '-',
    ) => {
      const withMC = new PriorityEntity({ ...e, monthlyClass: mc });
      const dto = new ResponsePriorityDto(withMC);
      dto.compliance = compliance;
      return dto;
    };

    // Orden final (según tu prioridad)
    const ordered: ResponsePriorityDto[] = [
      ...openPrev.map((e) => tag(e, 'NO_CUMPLIDAS_MESES_ATRAS', '0%')),
      ...notCompletedOverdue.map((e) => tag(e, 'NO_CUMPLIDAS_ATRASADAS', '0%')),
      ...inProgress.map((e) => tag(e, 'EN_PROCESO', '-')),
      ...completedLate.map((e) => tag(e, 'CUMPLIDAS_ATRASADAS', '100%')),
      ...completedPreviousMonths.map((e) =>
        tag(e, 'CUMPLIDAS_MESES_ATRAS', '100%'),
      ),
      ...completedInOtherMonth.map((e) => tag(e, 'CUMPLIDAS_OTRO_MES', '100%')),
      ...completedOnTime.map((e) => tag(e, 'CUMPLIDAS_A_TIEMPO', '100%')),
      ...canceledInMonth.map((e) => tag(e, 'ANULADAS', '-')),
    ];

    const total = ordered.length;

    // Paginación al final (coherente con el orden cruzado)
    const start = (page - 1) * limit;
    const paged = ordered.slice(start, start + limit);

    // Adjunta ICP del mismo scope
    const icpQuery = {
      month: f.month,
      year: f.year,
      positionId: f.positionId,
      objectiveId: f.objectiveId,
    };
    const icp = await this.calculateIcp(icpQuery);

    return {
      items: paged,
      total,
      page,
      limit,
      icp,
    };
  }

  async reorder(
    items: { id: string; order: number }[],
  ): Promise<ResponsePriorityDto[]> {
    const updated = await this.repo.reorderReturn(items);
    return updated.map((e) => new ResponsePriorityDto(e));
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    userId: string,
  ): Promise<ResponsePriorityDto> {
    const r = await this.repo.toggleActive(id, isActive, userId);
    return new ResponsePriorityDto(r);
  }

  // -------- Clasificación mensual (derivada, no persiste) --------

  private withMonthlyClass(
    p: PriorityEntity,
    month?: number,
    year?: number,
    now: Date = new Date(),
  ): PriorityEntity {
    const mc = this.computeMonthlyClass(p, month, year, now);
    return new PriorityEntity({ ...p, monthlyClass: mc });
  }

  private computeMonthlyClass(
    p: PriorityEntity,
    month?: number,
    year?: number,
    now: Date = new Date(),
  ): MonthlyClass | undefined {
    if (!month || !year) return undefined; // si no hay periodo consultado, no clasificamos

    const period = { m: month, y: year };
    const until = this.onlyDate(p.untilAt);
    const finished = p.finishedAt ? this.onlyDate(p.finishedAt) : undefined;
    const canceled = p.canceledAt ? this.onlyDate(p.canceledAt) : undefined;
    const today = this.onlyDate(now);

    const isInPeriod = (d?: Date) =>
      !!d &&
      d.getUTCFullYear() === period.y &&
      d.getUTCMonth() + 1 === period.m;
    const isBeforePeriod = (d?: Date) =>
      !!d &&
      (d.getUTCFullYear() < period.y ||
        (d.getUTCFullYear() === period.y && d.getUTCMonth() + 1 < period.m));
    const isAfterPeriod = (d?: Date) =>
      !!d &&
      (d.getUTCFullYear() > period.y ||
        (d.getUTCFullYear() === period.y && d.getUTCMonth() + 1 > period.m));

    // Anuladas en el mes consultado
    if (p.status === 'CAN' && isInPeriod(canceled)) return 'ANULADAS';

    // Cerradas en el mes consultado
    if (p.status === 'CLO' && isInPeriod(finished)) {
      if (isInPeriod(until)) {
        // límite del mismo mes
        if (finished! <= until) return 'CUMPLIDAS_A_TIEMPO';
        return 'CUMPLIDAS_ATRASADAS_DEL_MES';
      }
      if (isBeforePeriod(until)) return 'CUMPLIDAS_ATRASADAS_MESES_ANTERIORES';
      if (isAfterPeriod(finished) && isInPeriod(until))
        return 'CUMPLIDAS_DE_OTRO_MES';

      return 'CUMPLIDAS_A_TIEMPO';
    }

    // Abiertas / No cumplidas
    if (p.status === 'OPE') {
      if (isInPeriod(until)) {
        if (today <= until) return 'ABIERTAS';
        return 'NO_CUMPLIDAS_ATRASADAS_DEL_MES';
      }
      if (isBeforePeriod(until)) {
        return 'NO_CUMPLIDAS_ATRASADAS_MESES_ANTERIORES';
      }
    }

    return undefined;
  }

  async calculateIcp(
    q: CalculatePriorityIcpDto,
  ): Promise<ResponsePriorityIcpDto> {
    // --- Rango del período (UTC) ---
    const periodStart = new Date(Date.UTC(q.year, q.month - 1, 1));
    const periodEnd = new Date(Date.UTC(q.year, q.month, 0, 23, 59, 59, 999));

    // --- Datos base del repo ---
    const closed = await this.repo.listClosedInMonth(q); // select: finishedAt, untilAt
    const openInMonth = await this.repo.listOpenInMonth(q); // select: untilAt
    const notCompletedPreviousMonths =
      await this.repo.countOpenPreviousMonths(q);
    const completedInOtherMonth = await this.repo.countCompletedInOtherMonth(q);
    const base = await this.repo.aggregateIcp(q); // solo usamos base.canceled

    // --- Clasificación de CERRADAS en el mes ---
    let completedOnTime = 0;
    let completedLate = 0;
    let completedPreviousMonths = 0;
    let completedEarly = 0; // informativo (no entra al ICP de M)

    for (const r of closed) {
      if (!r.finishedAt || !r.untilAt) continue;

      const fin = this.onlyDate(r.finishedAt);
      const lim = this.onlyDate(r.untilAt);

      const limInThisMonth =
        lim.getUTCFullYear() === q.year && lim.getUTCMonth() + 1 === q.month;
      const limBeforeThisMonth = lim < periodStart;
      const limAfterThisMonth = lim > periodEnd;

      if (limInThisMonth) {
        if (fin <= lim) completedOnTime++;
        else completedLate++; // “late del mes”
      } else if (limBeforeThisMonth) {
        completedPreviousMonths++; // “cumplidas meses atrás”
      } else if (limAfterThisMonth) {
        completedEarly++; // cerrada por adelantado (excluida)
      }
    }

    // --- Clasificación de ABIERTAS del mes ---
    const now = new Date();
    const targetIdx = q.year * 12 + (q.month - 1);
    const currentIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();

    let inProgress = 0;
    let notCompletedOverdue = 0;

    if (targetIdx > currentIdx) {
      // MES FUTURO: todo lo abierto del mes es “en proceso”
      inProgress = openInMonth.length;
      notCompletedOverdue = 0;
    } else {
      // MES PASADO -> fin de mes; MES ACTUAL -> hoy (UTC truncado)
      const ref =
        targetIdx < currentIdx ? this.periodEnd(q) : this.onlyDate(now);

      for (const r of openInMonth) {
        const lim = this.onlyDate(r.untilAt as Date);
        if (lim < ref) notCompletedOverdue++;
        else inProgress++;
      }
    }

    // --- Totales del ICP ---
    // Numerador: cerradas en el mes planificadas hasta fin de mes
    const totalCompleted =
      completedOnTime + completedLate + completedPreviousMonths;

    // Denominador: todo lo planificado hasta fin de mes
    const totalPlanned =
      openInMonth.length + // due en M (OPE)
      notCompletedPreviousMonths + // due antes de M (OPE)
      totalCompleted + // due ≤ fin(M) cerradas en M
      completedInOtherMonth; // due en M cerradas después

    const icp = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

    return {
      month: q.month,
      year: q.year,
      positionId: q.positionId,
      objectiveId: q.objectiveId,
      totalPlanned,
      totalCompleted,
      icp: Math.round(icp * 100) / 100,
      notCompletedPreviousMonths,
      notCompletedOverdue,
      inProgress,
      completedPreviousMonths,
      completedLate,
      completedInOtherMonth,
      completedOnTime,
      canceled: base.canceled,
      completedEarly,
    };
  }

  private isBeforePeriod(
    date: Date,
    period: { month: number; year: number },
  ): boolean {
    const start = new Date(Date.UTC(period.year, period.month - 1, 1)); // primer día del mes consultado
    return date < start;
  }

  private onlyDate(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private periodEnd(q: { month: number; year: number }): Date {
    // último día del mes (UTC, 00:00)
    return new Date(Date.UTC(q.year, q.month, 0));
  }
}
