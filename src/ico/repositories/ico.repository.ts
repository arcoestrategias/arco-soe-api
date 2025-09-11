import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IcoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyIcoStatsByStrategicPlan(
    strategicPlanId: string,
    month: number,
    year: number,
  ): Promise<{
    totalGoals: number;
    measuredCount: number;
    sumIndexCompliance: number;
  }> {
    const whereByPlan = {
      month,
      year,
      isActive: true,
      objective: {
        strategicPlanId, // ← via relación Objective
        isActive: true,
      },
    } as const;

    const [totalGoals, agg] = await Promise.all([
      this.prisma.objectiveGoal.count({ where: whereByPlan }),
      this.prisma.objectiveGoal.aggregate({
        where: { ...whereByPlan, indexCompliance: { not: null } },
        _sum: { indexCompliance: true },
        _count: { indexCompliance: true },
      }),
    ]);

    return {
      totalGoals,
      measuredCount: agg._count.indexCompliance ?? 0,
      sumIndexCompliance: agg._sum.indexCompliance ?? 0,
    };
  }

  async findMonthlyGoalsWithPositionByStrategicPlan(
    strategicPlanId: string,
    month: number,
    year: number,
  ): Promise<
    Array<{
      positionId: string | null;
      positionName: string | null;
      indexCompliance: number | null;
    }>
  > {
    const rows = await this.prisma.objectiveGoal.findMany({
      where: {
        month,
        year,
        isActive: true,
        objective: { strategicPlanId, isActive: true },
      },
      select: {
        indexCompliance: true,
        objective: {
          select: {
            positionId: true,
            position: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      positionId: r.objective?.positionId ?? null,
      positionName: r.objective?.position?.name ?? null,
      indexCompliance: r.indexCompliance ?? null,
    }));
  }

  async findActiveObjectivesByPosition(positionId: string, search?: string) {
    return this.prisma.objective.findMany({
      where: {
        positionId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        indicator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findGoalsForMonthByObjectives(
    objectiveIds: string[],
    month: number,
    year: number,
  ) {
    if (!objectiveIds.length) return [];
    return this.prisma.objectiveGoal.findMany({
      where: {
        objectiveId: { in: objectiveIds },
        month,
        year,
        isActive: true,
      },
      select: {
        objectiveId: true,
        indexCompliance: true,
        light: true, // Float (1=GREEN, 2=YELLOW, 3=RED)
      },
    });
  }

  async findGoalsForObjectivesBetweenYears(
    objectiveIds: string[],
    fromYear: number,
    toYear: number,
  ) {
    if (!objectiveIds.length) return [];
    return this.prisma.objectiveGoal.findMany({
      where: {
        objectiveId: { in: objectiveIds },
        year: { gte: fromYear, lte: toYear },
        isActive: true,
      },
      select: {
        objectiveId: true,
        month: true,
        year: true,
        indexCompliance: true,
        light: true, // 1,2,3
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  async findObjectivesWithIndicatorByPosition(
    positionId: string,
    search?: string,
  ) {
    return this.prisma.objective.findMany({
      where: {
        positionId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true, // objectiveDescription
        order: true, // objectiveOrder
        perspective: true,
        level: true,
        valueOrientation: true,
        goalValue: true,
        status: true,
        isActive: true,
        parent: {
          // objectiveParent
          select: { id: true, name: true },
        },
        indicator: {
          select: {
            id: true,
            name: true,
            description: true,
            formula: true,
            isConfigured: true,
            origin: true,
            tendence: true,
            frequency: true,
            measurement: true,
            type: true,
            reference: true,
            periodStart: true,
            periodEnd: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findCurrentMonthGoalsByObjectives(
    objectiveIds: string[],
    month: number,
    year: number,
  ) {
    if (!objectiveIds.length) return [];
    return this.prisma.objectiveGoal.findMany({
      where: { objectiveId: { in: objectiveIds }, month, year, isActive: true },
      select: { objectiveId: true, id: true, realValue: true },
    });
  }

  async countPendingGoalsUpToByObjectives(
    objectiveIds: string[],
    month: number,
    year: number,
  ): Promise<Map<string, number>> {
    if (!objectiveIds.length) return new Map();

    const groups = await this.prisma.objectiveGoal.groupBy({
      by: ['objectiveId'],
      where: {
        objectiveId: { in: objectiveIds },
        isActive: true,
        AND: [
          {
            OR: [
              { year: { lt: year } },
              { AND: [{ year }, { month: { lte: month } }] },
            ],
          },
          // ✅ Pendiente ≡ sin registro
          { realValue: null },
        ],
      },
      _count: { _all: true },
    });

    const map = new Map<string, number>();
    for (const g of groups) map.set(g.objectiveId, g._count._all);
    return map;
  }
  //----------------------------------------------------------------------------------------------------
  /**
   * Objetivos (con su indicador) cuyo período del indicador se solapa con [fromYear..toYear].
   * Incluye los ObjectiveGoal del rango para construir las series.
   */
  async listObjectivesWithIndicatorAndGoalsInYearRange(params: {
    strategicPlanId: string;
    positionId: string;
    fromYear: number;
    toYear: number;
    search?: string;
  }) {
    const { strategicPlanId, positionId, fromYear, toYear, search } = params;

    // Límites anclados al mes/año (primer día del mes) — ignoramos día/hora.
    const rangeStart = new Date(Date.UTC(fromYear, 0, 1)); // 1/ene fromYear 00:00Z
    const rangeEnd = new Date(Date.UTC(toYear, 11, 1)); // 1/dic toYear 00:00Z

    return this.prisma.objective.findMany({
      where: {
        strategicPlanId,
        positionId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        indicator: {
          is: {
            isActive: true,
            // Solape del período del indicador con el rango de años solicitado.
            // (por mes/año; tus periodStart/periodEnd ya guardan la semántica mensual)
            periodStart: { lte: rangeEnd },
            periodEnd: { gte: rangeStart },
          },
        },
      },
      include: {
        indicator: true,
        objectiveGoals: {
          where: {
            isActive: true,
            year: { gte: fromYear, lte: toYear },
          },
          // IMPORTANTE: incluir 'light' para el semáforo, y 'indexCompliance' para el ICO.
          select: {
            month: true,
            year: true,
            indexCompliance: true,
            light: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }
}
