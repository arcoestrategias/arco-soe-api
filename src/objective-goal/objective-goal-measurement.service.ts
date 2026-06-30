import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ObjectiveGoalMeasurementRepository } from './repositories/objective-goal-measurement.repository';
import { ObjectiveGoalService } from './objective-goal.service';
import { ObjectiveGoalRepository } from './repositories/objective-goal.repository';
import { ObjectiveGoalMeasurementEntity } from './entities/objective-goal-measurement.entity';

@Injectable()
export class ObjectiveGoalMeasurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly measurementRepo: ObjectiveGoalMeasurementRepository,
    private readonly goalService: ObjectiveGoalService,
    private readonly goalRepo: ObjectiveGoalRepository,
  ) {}

  async findByGoalId(goalId: string): Promise<ObjectiveGoalMeasurementEntity[]> {
    return this.measurementRepo.findByGoalId(goalId);
  }

  async saveBatch(
    goalId: string,
    measurements: Array<{
      index: number;
      result?: number | null;
      measuredAt?: string;
      observation?: string | null;
      isIgnore?: boolean;
    }>,
    userId: string,
  ): Promise<{
    measurements: ObjectiveGoalMeasurementEntity[];
    consolidatedResult: number | null;
  }> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal || !goal.isActive) {
      throw new NotFoundException('ObjectiveGoal no encontrado');
    }

    // Validar fechas dentro del mes del goal
    const monthStart = new Date(Date.UTC(goal.year, goal.month - 1, 1));
    const monthEnd = new Date(Date.UTC(goal.year, goal.month, 0, 23, 59, 59, 999));

    let lastDate: Date | null = null;
    for (const m of measurements) {
      if (m.measuredAt) {
        const d = new Date(m.measuredAt.slice(0, 10) + "T12:00:00.000Z");
        if (d < monthStart || d > monthEnd) {
          throw new BadRequestException(
            `Medición ${m.index}: la fecha debe estar dentro de ${goal.month}/${goal.year}`,
          );
        }
        if (lastDate && d < lastDate) {
          throw new BadRequestException(
            `Medición ${m.index}: la fecha debe ser posterior o igual a la medición anterior`,
          );
        }
        lastDate = d;
      }
    }

    const prepared = measurements.map((m) => ({
      index: m.index,
      result: m.result != null ? Number(m.result) : null,
      measuredAt: m.measuredAt
        ? new Date(m.measuredAt.slice(0, 10) + "T12:00:00.000Z")
        : null,
      observation: m.observation ?? null,
      isIgnore: m.isIgnore ?? false,
    }));

    const saved = await this.measurementRepo.saveBatch(goalId, prepared, userId);

    const indicator = await this.getIndicatorFromGoal(goalId);
    const method = indicator?.calculationMethod ?? 'ACCUMULATIVE';

    const consolidatedResult = this.calculateConsolidated(
      prepared.map((m) => ({
        result: m.result,
        measuredAt: m.measuredAt ?? new Date(),
        isIgnore: m.isIgnore ?? false,
      })),
      method,
    );

    await this.goalService.update(goalId, { realValue: consolidatedResult as any }, userId);

    return { measurements: saved, consolidatedResult };
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.measurementRepo.softDelete(id, userId);
  }

  async updateMeasurementCount(
    goalId: string,
    count: number,
    applyToFuture: boolean,
    userId: string,
  ): Promise<void> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal || !goal.isActive) throw new NotFoundException('ObjectiveGoal no encontrado');

    await this.goalRepo.updateMeasurementCount(goalId, count, userId);

    const method = (await this.getIndicatorFromGoal(goalId))?.calculationMethod ?? 'ACCUMULATIVE';

    const doRecalc = async (gid: string) => {
      const meas = await this.measurementRepo.findByGoalId(gid);
      const all = meas.sort((a: any, b: any) => a.index - b.index);
      if (all.length >= count) {
        const withValue = all.filter((m: any) => m.result != null);
        let keep: any[] = withValue.slice(-count);
        const keepIds = new Set(keep.map((m: any) => m.id));
        const needed = count - keep.length;
        if (needed > 0) {
          const empty = all.filter((m: any) => m.result == null && !keepIds.has(m.id));
          keep = [...keep, ...empty.slice(-needed)];
        }
        keep.sort((a: any, b: any) => a.index - b.index);
        const remove = all.filter((m: any) => !keep.some((k: any) => k.id === m.id));
        for (let i = 0; i < keep.length; i++) {
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: keep[i].id },
            data: { index: i + 1, updatedBy: userId },
          });
        }
        for (const m of remove) {
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: m.id },
            data: { isActive: false, updatedBy: userId },
          });
        }
      }
      const activeMeas = await this.measurementRepo.findByGoalId(gid);
      const prepared = activeMeas.map((m: any) => ({
        result: m.result ? Number(m.result) : null,
        measuredAt: m.measuredAt ?? new Date(),
        isIgnore: m.isIgnore,
      }));
      const consolidated = this.calculateConsolidated(prepared, method);
      if (consolidated != null) {
        await this.goalService.update(gid, { realValue: consolidated }, userId);
      }
    };

    await doRecalc(goalId);

    if (applyToFuture) {
      const futureGoals = await this.goalRepo.findActiveByObjectiveAndMonthRange(
        goal.objectiveId, goal.month, goal.year,
      );
      for (const fg of futureGoals) {
        if (fg.id === goalId) continue;
        await this.goalRepo.updateMeasurementCount(fg.id, count, userId);
        await doRecalc(fg.id);
      }
    }
  }

  async recalculateByIndicator(
    indicatorId: string,
    calculationMethod: string,
    measurementCount: number | null,
    userId: string,
    forceAll = false,
    measMonths?: Array<{ month: number; year: number }>,
  ): Promise<void> {
    const whereClause: any = {
      objective: { indicatorId },
      isActive: true,
    };
    if (!forceAll) {
      // Si no es forceAll, solo actualizar goals SIN measurementCount personalizado
      whereClause.measurementCount = null;
    }
    if (Array.isArray(measMonths) && measMonths.length > 0) {
      // Solo procesar los meses seleccionados en measurementMonths
      whereClause.OR = measMonths.map((m) => ({
        month: m.month,
        year: m.year,
      }));
    }
    const goals = await this.prisma.objectiveGoal.findMany({
      where: whereClause,
      include: {
        measurements: {
          where: { isActive: true },
          orderBy: { index: 'asc' },
        },
      },
    });

    for (const goal of goals) {
      // Ajustar cantidad de mediciones si se reduce
      if (measurementCount != null && goal.measurements.length >= measurementCount) {
        const all = [...goal.measurements].sort((a, b) => a.index - b.index);
        const withValue = all.filter((m) => m.result != null);
        let keep = withValue.slice(-measurementCount);
        const keepIds = new Set(keep.map((m) => m.id));
        const needed = measurementCount - keep.length;
        if (needed > 0) {
          const empty = all.filter((m) => m.result == null && !keepIds.has(m.id));
          keep = [...keep, ...empty.slice(-needed)];
        }
        keep.sort((a, b) => a.index - b.index);
        const remove = all.filter((m) => !keep.some((k) => k.id === m.id));

        for (let i = 0; i < keep.length; i++) {
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: keep[i].id },
            data: { index: i + 1, updatedBy: userId },
          });
        }
        for (const m of remove) {
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: m.id },
            data: { isActive: false, updatedBy: userId },
          });
        }
        // Recargar mediciones activas después del ajuste
        const activeMeas = await this.measurementRepo.findByGoalId(goal.id);
        const prepared = activeMeas.map((m) => ({
          result: m.result ? Number(m.result) : null,
          measuredAt: m.measuredAt ?? new Date(),
          isIgnore: m.isIgnore,
        }));

        const consolidated = this.calculateConsolidated(prepared, calculationMethod);
        if (consolidated != null) {
          await this.goalService.update(goal.id, { realValue: consolidated }, userId);
        }
      } else {
        const prepared = goal.measurements.map((m) => ({
          result: m.result ? Number(m.result) : null,
          measuredAt: new Date(m.measuredAt ?? new Date()),
          isIgnore: m.isIgnore,
        }));

        const consolidated = this.calculateConsolidated(prepared, calculationMethod);
        if (consolidated != null) {
          await this.goalService.update(goal.id, { realValue: consolidated }, userId);
        }
      }
      // Si forceAll, limpiar measurementCount del goal para que herede el global
      if (forceAll) {
        await this.prisma.objectiveGoal.update({
          where: { id: goal.id },
          data: { measurementCount: null, updatedBy: userId },
        });
      }
    }
  }

  private calculateConsolidated(
    measurements: Array<{ result?: number | null; measuredAt: Date; isIgnore: boolean }>,
    method: string,
  ): number | null {
    const valid = measurements.filter(
      (m) => m.result != null && !m.isIgnore,
    );

    if (valid.length === 0) return null;

    const values = valid.map((m) => Number(m.result));

    switch (method) {
      case 'ACCUMULATIVE':
        return Number(values.reduce((a, b) => a + b, 0).toFixed(2));
      case 'AVERAGE':
        return Number(
          (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        );
      case 'LAST_VALUE':
        const last = valid.reduce((prev, curr) =>
          curr.measuredAt >= prev.measuredAt ? curr : prev,
        );
        return Number(last.result);
      default:
        return null;
    }
  }

  private async getIndicatorFromGoal(goalId: string) {
    const goal = await this.prisma.objectiveGoal.findUnique({
      where: { id: goalId },
      include: { objective: { include: { indicator: true } } },
    });
    return (goal as any)?.objective?.indicator ?? null;
  }
}
