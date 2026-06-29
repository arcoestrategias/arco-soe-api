import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { ObjectiveGoalMeasurementEntity } from '../entities/objective-goal-measurement.entity';

@Injectable()
export class ObjectiveGoalMeasurementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGoalId(goalId: string): Promise<ObjectiveGoalMeasurementEntity[]> {
    try {
      const rows = await this.prisma.objectiveGoalMeasurement.findMany({
        where: { objectiveGoalId: goalId, isActive: true },
        orderBy: { index: 'asc' },
      });
      return rows.map((r) => new ObjectiveGoalMeasurementEntity(r));
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  async saveBatch(
    goalId: string,
    measurements: Array<{
      index: number;
      result?: number | null;
      measuredAt?: Date | null;
      observation?: string | null;
      isIgnore?: boolean;
    }>,
    userId: string,
  ): Promise<ObjectiveGoalMeasurementEntity[]> {
    try {
      const active = await this.prisma.objectiveGoalMeasurement.findMany({
        where: { objectiveGoalId: goalId, isActive: true },
      });
      const all = await this.prisma.objectiveGoalMeasurement.findMany({
        where: { objectiveGoalId: goalId },
      });

      const incomingIndexes = measurements.map((m) => m.index);

      for (const m of measurements) {
        const activeMatch = active.find((e) => e.index === m.index);

        if (m.result == null) {
          // Soft delete si resultado es null
          if (activeMatch) {
            await this.prisma.objectiveGoalMeasurement.update({
              where: { id: activeMatch.id },
              data: { isActive: false, updatedBy: userId },
            });
          }
          continue;
        }

        if (activeMatch) {
          // UPDATE
          const updateData: any = {
            result: m.result,
            observation: m.observation,
            isIgnore: m.isIgnore ?? false,
            updatedBy: userId,
          };
          if (m.measuredAt !== undefined) updateData.measuredAt = m.measuredAt;
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: activeMatch.id },
            data: updateData,
          });
          continue;
        }

        // Buscar inactivo para reactivar
        const inactiveMatch = all.find(
          (e) => e.index === m.index && !e.isActive,
        );
        if (inactiveMatch) {
          const reactivateData: any = {
            result: m.result,
            observation: m.observation,
            isIgnore: m.isIgnore ?? false,
            isActive: true,
            updatedBy: userId,
          };
          if (m.measuredAt !== undefined) reactivateData.measuredAt = m.measuredAt;
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: inactiveMatch.id },
            data: reactivateData,
          });
          continue;
        }

        // CREATE
        const createData: any = {
          objectiveGoalId: goalId,
          index: m.index,
          result: m.result,
          observation: m.observation,
          isIgnore: m.isIgnore ?? false,
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
        };
        if (m.measuredAt !== undefined) createData.measuredAt = m.measuredAt;
        await this.prisma.objectiveGoalMeasurement.create({
          data: createData,
        });
      }

      // Soft delete activos que ya no están en la lista entrante
      for (const e of active) {
        if (!incomingIndexes.includes(e.index)) {
          await this.prisma.objectiveGoalMeasurement.update({
            where: { id: e.id },
            data: { isActive: false, updatedBy: userId },
          });
        }
      }

      return this.findByGoalId(goalId);
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  async softDelete(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.objectiveGoalMeasurement.update({
        where: { id },
        data: { isActive: false, updatedBy: userId },
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }
}
