import { Injectable } from '@nestjs/common';
import { IcoRepository } from './repositories/ico.repository';
import { GetFilteredObjectivesMonthlySeriesDto } from './dto/get-filtered-objectives-monthly-series.dto';

function resolveMonthYearFrom(
  inp?: { month?: number; year?: number },
  now = new Date(),
): { month: number; year: number } {
  const m = inp?.month ?? now.getMonth() + 1;
  const y = inp?.year ?? now.getFullYear();
  return { month: m, year: y };
}

function resolveYearSpan(fromYear?: number, toYear?: number) {
  const now = new Date();
  const fy = fromYear ?? now.getFullYear();
  const ty = toYear ?? fy;
  return fy <= ty ? { fromYear: fy, toYear: ty } : { fromYear: ty, toYear: fy };
}

function buildMonthSpan(fromYear: number, toYear: number) {
  const months: Array<{ month: number; year: number; isCurrent: boolean }> = [];
  const now = new Date();
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();

  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push({
        month: m,
        year: y,
        isCurrent: y === curY && m === curM,
      });
    }
  }
  return months;
}

/** ===================== Helpers MES/AÑO ===================== **/
const ymKey = (y: number, m: number) => `${y}-${m}`;
const ymIndex = (y: number, m: number) => y * 12 + m; // para comparar meses

function iterateYearMonth(fromYear: number, toYear: number) {
  const out: Array<{ year: number; month: number; isCurrent: boolean }> = [];
  const now = new Date();
  const cy = now.getUTCFullYear();
  const cm = now.getUTCMonth() + 1;
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      out.push({ year: y, month: m, isCurrent: y === cy && m === cm });
    }
  }
  return out;
}

/** ===================== Semáforo ===================== **/
const SEMAPHORE_COLOR_BY_NUM: Record<number, string> = {
  1: '#9aff6bff', // verde
  2: '#f3ff71ff', // amarillo
  3: '#f65c5cff', // rojo
};
const GRAY = '#9c9999ff';

const getLightColor = (light?: number | null) =>
  light ? (SEMAPHORE_COLOR_BY_NUM[light] ?? GRAY) : GRAY;

function getLightNumericByIco(ico: number): 1 | 2 | 3 {
  if (ico >= 99) return 1;
  if (ico >= 75.01 && ico < 98.99) return 2;
  return 3;
}

const MONTH_LABELS_ES = [
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
const monthLabel = (m: number) => MONTH_LABELS_ES[(m - 1 + 12) % 12];

@Injectable()
export class IcoService {
  constructor(private readonly repo: IcoRepository) {}

  async computeMonthlyIcoForStrategicPlan(
    strategicPlanId: string,
    month?: number,
    year?: number,
    mode: 'all' | 'measured' = 'all',
  ) {
    const { month: m, year: y } = resolveMonthYearFrom({ month, year });

    // 1) Métrica global (ponderada por cantidad de goals)
    const { totalGoals, measuredCount, sumIndexCompliance } =
      await this.repo.getMonthlyIcoStatsByStrategicPlan(strategicPlanId, m, y);

    const planDivisor = mode === 'measured' ? measuredCount : totalGoals;
    const icoByGoals =
      planDivisor > 0
        ? Number((sumIndexCompliance / planDivisor).toFixed(2))
        : 0;

    // 2) Desglose por posición (para luego promediar por cargo)
    const goalsWithPosition =
      await this.repo.findMonthlyGoalsWithPositionByStrategicPlan(
        strategicPlanId,
        m,
        y,
      );

    type PosAgg = {
      name: string;
      total: number;
      measured: number;
      sum: number;
    };
    const byPos = new Map<string, PosAgg>();
    for (const g of goalsWithPosition) {
      const pid = g.positionId ?? '__NO_POSITION__';
      const pname = g.positionName ?? 'Sin posición';
      if (!byPos.has(pid))
        byPos.set(pid, { name: pname, total: 0, measured: 0, sum: 0 });
      const agg = byPos.get(pid)!;
      agg.total += 1;
      if (g.indexCompliance != null) {
        agg.measured += 1;
        agg.sum += g.indexCompliance;
      }
    }

    const positions = Array.from(byPos.entries())
      .map(([positionId, agg]) => {
        const divisor = mode === 'measured' ? agg.measured : agg.total;
        const positionIco =
          divisor > 0 ? Number((agg.sum / divisor).toFixed(2)) : 0;
        return {
          positionId: positionId === '__NO_POSITION__' ? null : positionId,
          positionName: agg.name,
          ico: positionIco,
          totalGoals: agg.total,
          measuredCount: agg.measured,
          unmeasuredCount: Math.max(0, agg.total - agg.measured),
          mode,
        };
      })
      .sort((a, b) =>
        (a.positionName ?? '').localeCompare(b.positionName ?? ''),
      );

    // 3) Promedio simple del ICO por cargo (cada cargo pesa igual)
    const applies = (p: (typeof positions)[number]) =>
      (mode === 'measured' ? p.measuredCount : p.totalGoals) > 0;

    const validPositions = positions.filter(applies);
    const icoByPositions =
      validPositions.length > 0
        ? Number(
            (
              validPositions.reduce((acc, p) => acc + p.ico, 0) /
              validPositions.length
            ).toFixed(2),
          )
        : 0;

    /**
     * 🔎 Diferencias de agregación:
     * - icoByGoals: promedio PONDERADO por cantidad de ObjectiveGoals (cada objetivo pesa 1).
     *               Equivale a promediar los ICO de cada cargo ponderando por cuántos goals tiene.
     * - icoByPositions: promedio SIMPLE de los ICO por cargo (cada cargo pesa igual, tenga 2 o 20 goals).
     * Ejemplo: A(1 goal, ICO=100) y B(9 goals, ICO=50) ⇒
     *   - icoByGoals = (100*1 + 50*9) / (1+9) = 55
     *   - icoByPositions = (100 + 50) / 2 = 75
     */
    return {
      strategicPlanId,
      month: m,
      year: y,
      // mantenemos compatibilidad: 'ico' es el ponderado por goals
      ico: icoByGoals,
      icoByGoals,
      icoByPositions,
      totalGoals,
      measuredCount,
      unmeasuredCount: Math.max(0, totalGoals - measuredCount),
      mode,
      positions,
    };
  }

  async listObjectivesWithMonthlyIcoByPosition(
    positionId: string,
    opts: {
      month?: number;
      year?: number;
      search?: string;
      mode?: 'all' | 'measured';
    } = {},
  ) {
    const { month, year } = resolveMonthYearFrom({
      month: opts.month,
      year: opts.year,
    });
    const mode = opts.mode ?? 'all';

    const objectives = await this.repo.findActiveObjectivesByPosition(
      positionId,
      opts.search,
    );
    const objectiveIds = objectives.map((o) => o.id);

    const goals = await this.repo.findGoalsForMonthByObjectives(
      objectiveIds,
      month,
      year,
    );
    const goalByObjective = new Map(goals.map((g) => [g.objectiveId, g]));

    // filas por objetivo (ya lo tenías)
    const rows = objectives.map((it) => {
      const g = goalByObjective.get(it.id);
      const ico = g?.indexCompliance ?? 0;
      const lightNumeric = g?.light ?? null;
      const lightColorHex = lightNumeric
        ? (SEMAPHORE_COLOR_BY_NUM[lightNumeric] ?? '#858585')
        : '#858585';

      return {
        objectiveId: it.id,
        objectiveName: it.name,
        indicatorId: (it as any).indicator?.id ?? null,
        indicatorName: (it as any).indicator?.name ?? null,
        month,
        year,
        ico: Number((ico ?? 0).toFixed(2)),
        isMeasured: g?.indexCompliance != null,
        lightNumeric,
        lightColorHex,
      };
    });

    // === NUEVO: promedio del mes ===
    const totalObjectives = objectives.length;
    const measured = goals.filter((g) => g.indexCompliance != null);
    const measuredCount = measured.length;
    const sumIndexCompliance = measured.reduce(
      (acc, g) => acc + (g.indexCompliance ?? 0),
      0,
    );

    const divisor = mode === 'measured' ? measuredCount : totalObjectives;
    const averageIco =
      divisor > 0 ? Number((sumIndexCompliance / divisor).toFixed(2)) : 0;

    return {
      positionId,
      month,
      year,
      rows,
      summary: {
        averageIco,
        totalObjectives,
        measuredCount,
        unmeasuredCount: Math.max(0, totalObjectives - measuredCount),
        mode,
      },
    };
  }

  async listObjectivesIcoSeriesByPosition(
    positionId: string,
    opts: {
      fromYear?: number;
      toYear?: number;
      search?: string;
      mode?: 'all' | 'measured';
    } = {},
  ) {
    const { fromYear, toYear } = resolveYearSpan(opts.fromYear, opts.toYear);
    const monthSpan = buildMonthSpan(fromYear, toYear);
    const mode = opts.mode ?? 'all';

    const objectives = await this.repo.findActiveObjectivesByPosition(
      positionId,
      opts.search,
    );
    const totalObjectives = objectives.length;
    const objectiveIds = objectives.map((o) => o.id);

    const goals = await this.repo.findGoalsForObjectivesBetweenYears(
      objectiveIds,
      fromYear,
      toYear,
    );

    // indexar por objetivo y por (y-m)
    const key = (y: number, m: number) =>
      `${y}-${m.toString().padStart(2, '0')}`;
    const mapByObjective = new Map<
      string,
      Map<string, { indexCompliance: number | null; light: number | null }>
    >();
    const monthAgg = new Map<string, { sum: number; measured: number }>(); // ← NUEVO acumulador mensual

    for (const g of goals) {
      const k = key(g.year, g.month);
      if (!mapByObjective.has(g.objectiveId))
        mapByObjective.set(g.objectiveId, new Map());
      mapByObjective.get(g.objectiveId)!.set(k, {
        indexCompliance: g.indexCompliance ?? null,
        light: (g.light ?? null) as number | null,
      });

      // acumular para promedio mensual
      if (!monthAgg.has(k)) monthAgg.set(k, { sum: 0, measured: 0 });
      if (g.indexCompliance != null) {
        const agg = monthAgg.get(k)!;
        agg.sum += g.indexCompliance;
        agg.measured += 1;
      }
    }

    const rows = objectives.map((obj) => {
      const byMonth = mapByObjective.get(obj.id) ?? new Map();
      const series = monthSpan.map(({ month, year, isCurrent }) => {
        const k = key(year, month);
        const found = byMonth.get(k);
        const ico = found?.indexCompliance ?? 0;
        const lightNumeric = found?.light ?? null;
        const lightColorHex = lightNumeric
          ? (SEMAPHORE_COLOR_BY_NUM[lightNumeric] ?? '#858585')
          : '#858585';

        return {
          month,
          year,
          isCurrent,
          ico: Number((ico ?? 0).toFixed(2)),
          isMeasured: found?.indexCompliance != null,
          lightNumeric,
          lightColorHex,
        };
      });

      return {
        objectiveId: obj.id,
        objectiveName: obj.name,
        indicatorId: (obj as any).indicator?.id ?? null,
        indicatorName: (obj as any).indicator?.name ?? null,
        series,
      };
    });

    // === NUEVO: promedios mensuales alineados con months ===
    const monthlyAverages = monthSpan.map(({ month, year }) => {
      const k = key(year, month);
      const agg = monthAgg.get(k) ?? { sum: 0, measured: 0 };
      const divisor = mode === 'measured' ? agg.measured : totalObjectives;
      const averageIco =
        divisor > 0 ? Number((agg.sum / divisor).toFixed(2)) : 0;

      return {
        month,
        year,
        averageIco,
        totalObjectives,
        measuredCount: agg.measured,
        unmeasuredCount: Math.max(0, totalObjectives - agg.measured),
        mode,
      };
    });

    return {
      positionId,
      fromYear,
      toYear,
      months: monthSpan,
      monthlyAverages, // ← NUEVO
      rows,
    };
  }

  async listObjectivesStatusByPosition(
    positionId: string,
    options: { month?: number; year?: number; search?: string } = {},
  ): Promise<{
    positionId: string;
    month: number;
    year: number;
    rows: Array<{
      objective: {
        objectiveId: string;
        objectiveName: string;
        objectiveDescription: string | null;
        objectiveOrder: number | null;
        perspective: string | null;
        level: string | null;
        valueOrientation: string | null;
        goalValue: number | null;
        status: string | null;
        objectiveParent: { id: string; name: string } | null;
        isActive: boolean;
      };
      indicator: {
        indicatorId: string | null;
        indicatorName: string | null;
        indicatorDescription: string | null;
        formula: string | null;
        isConfigured: boolean;
        origin: string | null;
        tendence: string | null;
        frequency: string | null;
        measurement: string | null;
        type: string | null;
        reference: string | null;
        periodStart: Date | null;
        periodEnd: Date | null;
      };
      goalStatus: {
        month: number;
        year: number;
        hasCurrentMonthGoal: boolean;
        isMeasuredCurrentMonth: boolean; // realValue !== null
        pendingCount: number; // solo realValue IS NULL (hasta mes actual)
        statusLabel:
          | 'Medido'
          | `Pendiente: ${number}`
          | 'No se mide'
          | 'No Definido';
        statusClass: 'success' | 'warning' | 'primary' | 'secondary';
      };
    }>;
  }> {
    // Resolver mes/año (si no vienen, usar actuales)
    const now = new Date();
    const resolvedMonth = options.month ?? now.getMonth() + 1;
    const resolvedYear = options.year ?? now.getFullYear();

    // 1) Traer objetivos del cargo con su indicador
    const objectives = await this.repo.findObjectivesWithIndicatorByPosition(
      positionId,
      options.search,
    );
    const objectiveIds = objectives.map((o) => o.id);

    // 2) Traer OG del mes actual por objetivo (para flags del mes)
    const currentMonthGoals = await this.repo.findCurrentMonthGoalsByObjectives(
      objectiveIds,
      resolvedMonth,
      resolvedYear,
    );
    const currentGoalByObjectiveId = new Map(
      currentMonthGoals.map((g) => [g.objectiveId, g]),
    );

    // 3) Contar pendientes hasta el mes actual (solo realValue IS NULL)
    const pendingCountByObjectiveId =
      await this.repo.countPendingGoalsUpToByObjectives(
        objectiveIds,
        resolvedMonth,
        resolvedYear,
      ); // Promise<Map<string, number>>

    // 4) Armar respuesta
    const rows = objectives.map((objectiveRecord) => {
      const currentMonthGoal = currentGoalByObjectiveId.get(objectiveRecord.id);
      const hasCurrentMonthGoal = Boolean(currentMonthGoal);

      // “Registrado” ≡ realValue !== null (0 es válido como valor medido)
      const isMeasuredCurrentMonth =
        Boolean(currentMonthGoal) && currentMonthGoal!.realValue !== null;

      const pendingGoalsCount =
        pendingCountByObjectiveId.get(objectiveRecord.id) ?? 0;

      // Etiquetas según regla final
      let statusLabel:
        | 'Medido'
        | `Pendiente: ${number}`
        | 'No se mide'
        | 'No Definido' = 'No Definido';
      let statusClass: 'success' | 'warning' | 'primary' | 'secondary' =
        'secondary';

      if (!hasCurrentMonthGoal && pendingGoalsCount === 0) {
        statusLabel = 'No se mide';
        statusClass = 'primary';
      } else if (pendingGoalsCount > 0) {
        statusLabel = `Pendiente: ${pendingGoalsCount}`;
        statusClass = 'warning';
      } else {
        statusLabel = 'Medido';
        statusClass = 'success';
      }

      return {
        objective: {
          objectiveId: objectiveRecord.id,
          objectiveName: objectiveRecord.name,
          objectiveDescription: objectiveRecord.description ?? null,
          objectiveOrder: objectiveRecord.order ?? null,
          perspective: objectiveRecord.perspective ?? null,
          level: objectiveRecord.level ?? null,
          valueOrientation: objectiveRecord.valueOrientation ?? null,
          goalValue: objectiveRecord.goalValue ?? null,
          status: objectiveRecord.status ?? null,
          objectiveParent: objectiveRecord.parent
            ? {
                id: objectiveRecord.parent.id,
                name: objectiveRecord.parent.name,
              }
            : null,
          isActive: objectiveRecord.isActive,
        },
        indicator: {
          indicatorId: objectiveRecord.indicator?.id ?? null,
          indicatorName: objectiveRecord.indicator?.name ?? null,
          indicatorDescription: objectiveRecord.indicator?.description ?? null,
          formula: objectiveRecord.indicator?.formula ?? null,
          isConfigured: objectiveRecord.indicator?.isConfigured ?? false,
          origin: objectiveRecord.indicator?.origin ?? null,
          tendence: objectiveRecord.indicator?.tendence ?? null,
          frequency: objectiveRecord.indicator?.frequency ?? null,
          measurement: objectiveRecord.indicator?.measurement ?? null,
          type: objectiveRecord.indicator?.type ?? null,
          reference: objectiveRecord.indicator?.reference ?? null,
          periodStart: objectiveRecord.indicator?.periodStart ?? null,
          periodEnd: objectiveRecord.indicator?.periodEnd ?? null,
        },
        goalStatus: {
          month: resolvedMonth,
          year: resolvedYear,
          hasCurrentMonthGoal,
          isMeasuredCurrentMonth,
          pendingCount: pendingGoalsCount,
          statusLabel,
          statusClass,
        },
      };
    });

    return {
      positionId,
      month: resolvedMonth,
      year: resolvedYear,
      rows,
    };
  }

  /**
   * Serie mensual filtrando por plan/posición/años,
   * devolviendo solo objetivos cuyos indicadores se solapan con el rango.
   *
   * Reglas:
   * - isMeasured = true  ⇢ existe ObjectiveGoal para (año, mes)
   * - hasCompliance = true ⇢ ese ObjectiveGoal tiene indexCompliance no nulo
   * - Sin ObjectiveGoal → isMeasured=false, hasCompliance=false, ico=0, gris
   * - Con ObjectiveGoal pero sin indexCompliance → isMeasured=true, hasCompliance=false, ico=0, color por light
   * - Con ObjectiveGoal con indexCompliance → isMeasured=true, hasCompliance=true, ico=indexCompliance, color por light
   */
  async listFilteredObjectivesMonthlySeries(
    dto: GetFilteredObjectivesMonthlySeriesDto,
  ) {
    const { strategicPlanId, positionId, fromYear, toYear, search } = dto;

    const rows = await this.repo.listObjectivesWithIndicatorAndGoalsInYearRange(
      {
        strategicPlanId,
        positionId,
        fromYear,
        toYear,
        search,
      },
    );

    const span = iterateYearMonth(fromYear, toYear);

    // === Mes/año "activo" GLOBAL (mes actual clamp dentro del rango) ===
    const now = new Date();
    const curY = now.getUTCFullYear();
    const curM = now.getUTCMonth() + 1;

    const firstIdx = ymIndex(fromYear, 1);
    const lastIdx = ymIndex(toYear, 12);
    const curIdx = ymIndex(curY, curM);

    const targetIdx = Math.min(Math.max(curIdx, firstIdx), lastIdx);
    const lastActiveY = Math.floor((targetIdx - 1) / 12);
    const lastActiveM = targetIdx - lastActiveY * 12;

    // 1) Construir la lista de objetivos (cada uno con su icoMonthly + goalStatus)
    const listObjectives = rows.map((objectiveRecord: any) => {
      // Indexar goals por (year, month)
      const goals = new Map<string, any>();
      for (const g of objectiveRecord.objectiveGoals ?? []) {
        goals.set(ymKey(g.year, g.month), g);
      }

      const icoMonthly = span.map(({ year, month }) => {
        const found: any = goals.get(ymKey(year, month)); // fila ObjectiveGoal si existe

        if (!found) {
          return {
            month,
            year,
            ico: 0,
            isMeasured: false,
            hasCompliance: false,
            lightNumeric: null,
            lightColorHex: GRAY,
          };
        }

        const isMeasured = true; // hay registro ObjectiveGoal ese mes
        const hasCompliance = (found.realValue ?? 0) > 0;
        const ico = hasCompliance
          ? Number((found.indexCompliance ?? 0).toFixed(2))
          : 0;

        const lightNumeric: number | null = (found.light ?? null) as
          | number
          | null;
        const lightColorHex = getLightColor(lightNumeric);

        return {
          ...found, // todas las columnas del ObjectiveGoal
          month,
          year,
          ico,
          isMeasured,
          hasCompliance,
          lightNumeric,
          lightColorHex,
        };
      });

      // === Mes activo EFECTIVO por objetivo (clamp al periodo del indicador) ===
      const ind = objectiveRecord.indicator;
      const ps = ind?.periodStart
        ? new Date(ind.periodStart)
        : new Date(fromYear, 0, 1);
      const pe = ind?.periodEnd
        ? new Date(ind.periodEnd)
        : new Date(toYear, 11, 1);

      const psY = ps.getUTCFullYear();
      const psM = ps.getUTCMonth() + 1;
      const peY = pe.getUTCFullYear();
      const peM = pe.getUTCMonth() + 1;

      const startIdx = ymIndex(psY, psM);
      const endIdx = ymIndex(peY, peM);
      const effIdx = Math.min(Math.max(targetIdx, startIdx), endIdx);
      const effY = Math.floor((effIdx - 1) / 12);
      const effM = effIdx - effY * 12;

      // === goalStatus basado en icoMonthly (prioriza pendientes) ===
      const monthsUpToActive = icoMonthly.filter(
        (m) => ymIndex(m.year, m.month) <= effIdx,
      );

      const currentRec = icoMonthly.find(
        (m) => m.year === effY && m.month === effM,
      );

      // pendientes = meses con registro (isMeasured) SIN cumplimiento hasta el mes activo efectivo
      const pendingCount = monthsUpToActive.filter(
        (m) => m.isMeasured && !m.hasCompliance,
      ).length;

      const GOAL_STATUS_COLORS = {
        yellow: '#FACC15', // Pendiente
        blue: '#93C5FD', // No se mide
        green: '#22C55E', // Medido
      };

      // 🔧 Prioridad corregida:
      // 1) Si hay pendientes acumulados -> "Pendiente: N"
      // 2) Si el mes activo efectivo se midió -> "Medido"
      // 3) En otro caso -> "No se mide"
      let statusLabel: string;
      let lightColorHex: string;

      if (pendingCount > 0) {
        statusLabel = `Pendiente: ${pendingCount}`;
        lightColorHex = GOAL_STATUS_COLORS.yellow;
      } else if (currentRec?.isMeasured === true) {
        statusLabel = 'Medido';
        lightColorHex = GOAL_STATUS_COLORS.green;
      } else {
        statusLabel = 'No se mide';
        lightColorHex = GOAL_STATUS_COLORS.blue;
      }

      const goalStatus = {
        pendingCount,
        statusLabel,
        lightColorHex,
      };

      const { objectiveGoals, indicatorId, indicator, ...objectiveSafe } =
        objectiveRecord;

      return {
        objective: {
          ...objectiveSafe,
          indicator,
          icoMonthly,
          goalStatus,
        },
      };
    });

    // 2) Calcular los promedios mensuales (solo con isMeasured = true) + semáforo
    const totalObjectives = listObjectives.length;

    const monthlyAverages = span.map(({ year, month }) => {
      let sumIco = 0;
      let measuredCount = 0;

      for (const item of listObjectives) {
        const rec = item.objective.icoMonthly.find(
          (m: any) => m.year === year && m.month === month,
        );
        if (rec?.isMeasured) {
          sumIco += rec.ico;
          measuredCount++;
        }
      }

      const averageIco =
        measuredCount > 0 ? Number((sumIco / measuredCount).toFixed(2)) : 0;

      let lightNumeric: number | null = null;
      let lightColorHex = GRAY;
      if (measuredCount > 0) {
        lightNumeric = getLightNumericByIco(averageIco);
        lightColorHex = SEMAPHORE_COLOR_BY_NUM[lightNumeric];
      }

      return {
        month,
        year,
        averageIco,
        totalObjectives,
        measuredCount,
        unmeasuredCount: totalObjectives - measuredCount,
        lightNumeric,
        lightColorHex,
      };
    });

    // 3) Resume (global, mantiene el mes activo GLOBAL para cabecera)
    const monthsUpTo = monthlyAverages.filter(
      (m) => ymIndex(m.year, m.month) <= targetIdx,
    );
    const monthsWithData = monthsUpTo.filter((m) => m.measuredCount > 0);

    const generalAverage =
      monthsWithData.length > 0
        ? Number(
            (
              monthsWithData.reduce((acc, m) => acc + m.averageIco, 0) /
              monthsWithData.length
            ).toFixed(2),
          )
        : 0;

    const resume = {
      generalAverage,
      activeIndicators: listObjectives.length,
      lastActiveMonth: {
        month: lastActiveM,
        year: lastActiveY,
        label: monthLabel(lastActiveM),
      },
    };

    // 4) Respuesta final
    return {
      resume,
      listObjectives,
      monthlyAverages,
    };
  }
}
