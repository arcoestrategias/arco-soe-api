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
import { GetIcpSeriesDto } from './dto/get-icp-series.dto';
import { IcpSeriesItemDto, IcpSeriesResponseDto } from './dto/icp-series-response.dto';

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

  private todayLocalDate(tz = 'America/Guayaquil'): Date {
    // extrae año/mes/día en la zona local deseada
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const y = Number(parts.find((p) => p.type === 'year')!.value);
    const m = Number(parts.find((p) => p.type === 'month')!.value);
    const d = Number(parts.find((p) => p.type === 'day')!.value);

    // construye "YYYY-MM-DD 00:00:00Z" → al ser DATE, PG guardará ese día exacto
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  async update(
    id: string,
    dto: UpdatePriorityDto,
    userId: string,
  ): Promise<ResponsePriorityDto> {
    if (dto.status === 'CLO' && !dto.finishedAt) {
      dto.finishedAt = this.todayLocalDate(); // antes: new Date()
    }
    if (dto.status === 'CAN' && !dto.canceledAt) {
      dto.canceledAt = this.todayLocalDate(); // antes: new Date()
    }
    if (dto.status === 'OPE') {
      dto.finishedAt = null;
      dto.canceledAt = null;
    }

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

  // ============================================================
  // ===============         LIST (endpoint)         ============
  // ============================================================
  async list(f: FilterPriorityDto): Promise<ListPriorityResponseDto> {
    const page = f.page ?? 1;
    const limit = f.limit ?? 10;

    // Defaults si no llegan: mes/año actuales
    const now = new Date();
    const month = f.month ?? now.getMonth() + 1;
    const year = f.year ?? now.getFullYear();

    const scope = {
      month,
      year,
      positionId: f.positionId,
      objectiveId: f.objectiveId,
    };

    const ds = await this.getPeriodDataset(scope);
    const { items, buckets } = this.buildPeriodView(scope, ds);

    const total = items.length;
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    const icp = this.computeIcpFromBuckets(scope, buckets);

    return { items: paged, total, page, limit, icp };
  }

  // ============================================================
  // ===============         ICP (endpoint)          ============
  // ============================================================
  async calculateIcp(
    q: CalculatePriorityIcpDto,
  ): Promise<ResponsePriorityIcpDto> {
    const scope = {
      month: q.month,
      year: q.year,
      positionId: q.positionId,
      objectiveId: q.objectiveId,
    };
    const ds = await this.getPeriodDataset(scope);
    const { buckets } = this.buildPeriodView(scope, ds);
    return this.computeIcpFromBuckets(scope, buckets);
  }

  // ============================================================
  // ===============   Dataset unificado del mes    =============
  // ============================================================
  private async getPeriodDataset(scope: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const [
      openPrev,
      openInMonth,
      closedInMonth,
      canceledInMonth,
      completedInOtherMonth,
    ] = await Promise.all([
      this.repo.listOpenPreviousMonthsFull(scope),
      this.repo.listOpenInMonthFull(scope),
      this.repo.listClosedInMonthFull(scope),
      this.repo.listCanceledInMonthFull(scope),
      this.repo.listCompletedInOtherMonthFull(scope),
    ]);
    return {
      openPrev,
      openInMonth,
      closedInMonth,
      canceledInMonth,
      completedInOtherMonth,
    };
  }

  // ============================================================
  // ===============  Clasificación + Lista + Buckets ===========
  // ============================================================
  private buildPeriodView(
    scope: { month: number; year: number },
    ds: {
      openPrev: PriorityEntity[];
      openInMonth: PriorityEntity[];
      closedInMonth: PriorityEntity[];
      canceledInMonth: PriorityEntity[];
      completedInOtherMonth: PriorityEntity[];
    },
  ): {
    items: ResponsePriorityDto[];
    buckets: {
      notCompletedPreviousMonths: number;
      notCompletedOverdue: number;
      inProgress: number;
      completedPreviousMonths: number;
      completedLate: number;
      completedOnTime: number;
      completedInOtherMonth: number;
      canceled: number;
      completedEarly: number; // informativo
    };
  } {
    // ---------- 1) CERRADAS EN EL MES: onTime / late / prevMonths / early ----------
    const completedOnTime: PriorityEntity[] = [];
    const completedLate: PriorityEntity[] = [];
    const completedPreviousMonths: PriorityEntity[] = [];
    let completedEarly = 0; // solo contador informativo

    const periodStart = new Date(Date.UTC(scope.year, scope.month - 1, 1));
    const periodEnd = this.periodEnd(scope);

    for (const r of ds.closedInMonth) {
      if (!r.untilAt || !r.finishedAt) continue;
      const fin = this.onlyDate(r.finishedAt);
      const lim = this.onlyDate(r.untilAt);

      const limInThisMonth =
        lim.getUTCFullYear() === scope.year &&
        lim.getUTCMonth() + 1 === scope.month;
      const limBeforeThisMonth = lim < periodStart;
      const limAfterThisMonth = lim > periodEnd;

      if (limInThisMonth) {
        if (fin <= lim) completedOnTime.push(r);
        else completedLate.push(r);
      } else if (limBeforeThisMonth) {
        completedPreviousMonths.push(r);
      } else if (limAfterThisMonth) {
        completedEarly++; // no entra a ICP ni a items del período
      }
    }

    // ---------- 2) OPE del mes: inProgress vs overdue ----------
    const now = new Date();
    const targetIdx = scope.year * 12 + (scope.month - 1);
    const currentIdx = now.getUTCFullYear() * 12 + now.getUTCMonth();

    const inProgress: PriorityEntity[] = [];
    const notCompletedOverdue: PriorityEntity[] = [];

    if (targetIdx > currentIdx) {
      // MES FUTURO: todo OPE del mes = en progreso (0 overdue)
      inProgress.push(...ds.openInMonth);
    } else {
      // MES PASADO -> fin de mes; MES ACTUAL -> hoy
      const ref = targetIdx < currentIdx ? periodEnd : this.onlyDate(now);
      for (const r of ds.openInMonth) {
        const lim = this.onlyDate(r.untilAt!);
        if (lim < ref) notCompletedOverdue.push(r);
        else inProgress.push(r);
      }
    }

    // ---------- 3) Mapear monthlyClass + compliance por item ----------
    // Nomenclatura consistente con lo que ya usas
    const tag = (
      e: PriorityEntity,
      mc: string,
      compliance: '0%' | '100%' | '-',
    ) => {
      const withMC = new PriorityEntity({ ...e, monthlyClass: mc });
      const dto = new ResponsePriorityDto(withMC) as ResponsePriorityDto & {
        compliance?: '0%' | '100%' | '-';
      };
      dto.compliance = compliance;
      return dto;
    };

    // ---------- 4) Orden final (por severidad → progreso → éxito → canceladas) ----------
    const ordered: ResponsePriorityDto[] = [
      ...ds.openPrev.map((e) => tag(e, 'NO_CUMPLIDAS_MESES_ATRAS', '0%')),
      ...notCompletedOverdue.map((e) => tag(e, 'NO_CUMPLIDAS_ATRASADAS', '0%')),
      ...inProgress.map((e) => tag(e, 'EN_PROCESO', '-')),
      ...completedLate.map((e) => tag(e, 'CUMPLIDAS_ATRASADAS', '100%')),
      ...completedPreviousMonths.map((e) =>
        tag(e, 'CUMPLIDAS_ATRASADAS_MESES_ANTERIORES', '100%'),
      ),
      ...ds.completedInOtherMonth.map((e) =>
        tag(e, 'CUMPLIDAS_OTRO_MES', '100%'),
      ),
      ...completedOnTime.map((e) => tag(e, 'CUMPLIDAS_A_TIEMPO', '100%')),
      ...ds.canceledInMonth.map((e) => tag(e, 'ANULADAS', '-')),
    ];

    // ---------- 5) Buckets (contadores) ----------
    const buckets = {
      notCompletedPreviousMonths: ds.openPrev.length,
      notCompletedOverdue: notCompletedOverdue.length,
      inProgress: inProgress.length,
      completedPreviousMonths: completedPreviousMonths.length,
      completedLate: completedLate.length,
      completedOnTime: completedOnTime.length,
      completedInOtherMonth: ds.completedInOtherMonth.length,
      canceled: ds.canceledInMonth.length,
      completedEarly, // solo informativo
    };

    return { items: ordered, buckets };
  }

  // ============================================================
  // ===============     ICP desde los buckets     ==============
  // ============================================================
  private computeIcpFromBuckets(
    scope: {
      month: number;
      year: number;
      positionId?: string;
      objectiveId?: string;
    },
    b: {
      notCompletedPreviousMonths: number;
      notCompletedOverdue: number;
      inProgress: number;
      completedPreviousMonths: number;
      completedLate: number;
      completedOnTime: number;
      completedInOtherMonth: number;
      canceled: number;
      completedEarly: number;
    },
  ): ResponsePriorityIcpDto {
    // Numerador: solo cerradas en el mes planificadas hasta fin de mes
    const totalCompleted =
      b.completedOnTime + b.completedLate + b.completedPreviousMonths;

    // Denominador: todo lo planificado hasta fin de mes
    const totalPlanned =
      b.notCompletedPreviousMonths +
      b.notCompletedOverdue +
      b.inProgress +
      totalCompleted +
      b.completedInOtherMonth; // (due en M y cerradas después)

    const icp = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

    return {
      month: scope.month,
      year: scope.year,
      positionId: scope.positionId,
      objectiveId: scope.objectiveId,
      totalPlanned,
      totalCompleted,
      icp: Math.round(icp * 100) / 100,
      notCompletedPreviousMonths: b.notCompletedPreviousMonths,
      notCompletedOverdue: b.notCompletedOverdue,
      inProgress: b.inProgress,
      completedPreviousMonths: b.completedPreviousMonths,
      completedLate: b.completedLate,
      completedInOtherMonth: b.completedInOtherMonth,
      completedOnTime: b.completedOnTime,
      canceled: b.canceled,
      completedEarly: b.completedEarly, // informativo (no altera ICP)
    };
  }

  // ============================================================
  // ===============             Helpers           ==============
  // ============================================================

  /** Último día del mes consultado (UTC, 00:00) */
  private periodEnd(period: { month: number; year: number }): Date {
    return new Date(Date.UTC(period.year, period.month, 0));
  }

  /** Fecha normalizada a YYYY-MM-DD (UTC) */
  private onlyDate(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

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

  private parseYm(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    return { year: y, month: m };
  }
  private diffInMonths(
    a: { year: number; month: number },
    b: { year: number; month: number },
  ) {
    return (b.year - a.year) * 12 + (b.month - a.month);
  }

  async icpSeries(q: GetIcpSeriesDto): Promise<IcpSeriesResponseDto> {
    const from = this.parseYm(q.from);
    const to = this.parseYm(q.to);

    const diff = this.diffInMonths(from, to);
    if (diff < 0) throw new BadRequestException('from debe ser <= to');
    if (diff > 36)
      throw new BadRequestException('Rango demasiado grande (máx 36 meses)');

    const items: IcpSeriesItemDto[] = [];

    let y = from.year,
      m = from.month;
    for (;;) {
      const scope = {
        month: m,
        year: y,
        positionId: q.positionId,
        objectiveId: q.objectiveId,
      };

      // Reusa tu pipeline mensual
      const ds = await this.getPeriodDataset(scope);
      const { buckets } = this.buildPeriodView(scope, ds);
      const icp = this.computeIcpFromBuckets(scope, buckets);

      items.push({
        month: m,
        year: y,
        icp: icp.icp,
        totalPlanned: icp.totalPlanned,
        totalCompleted: icp.totalCompleted,
        inProgress: icp.inProgress,
        notCompletedOverdue: icp.notCompletedOverdue,
        notCompletedPreviousMonths: icp.notCompletedPreviousMonths,
        completedOnTime: icp.completedOnTime,
        completedLate: icp.completedLate,
        completedPreviousMonths: icp.completedPreviousMonths,
        completedInOtherMonth: icp.completedInOtherMonth,
        canceled: icp.canceled,
        completedEarly: icp.completedEarly,
      });

      if (y === to.year && m === to.month) break;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return {
      positionId: q.positionId,
      objectiveId: q.objectiveId,
      from: q.from,
      to: q.to,
      items,
    };
  }
}
