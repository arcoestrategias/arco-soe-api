import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateObjectiveGoalDto, UpdateObjectiveGoalDto } from '../dto';
import { ObjectiveGoalEntity } from '../entities/objective-goal.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class ObjectiveGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    try {
      const created = await this.prisma.objectiveGoal.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new ObjectiveGoalEntity(created);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createMany(
    items: CreateObjectiveGoalDto[],
    userId: string,
  ): Promise<ObjectiveGoalEntity[]> {
    try {
      const queries = items.map((data) =>
        this.prisma.objectiveGoal.create({
          data: {
            ...data,
            createdBy: userId,
            updatedBy: userId,
          },
        }),
      );

      const created = await this.prisma.$transaction(queries);
      return created.map((g) => new ObjectiveGoalEntity(g));
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findById(id: string): Promise<ObjectiveGoalEntity | null> {
    const found = await this.prisma.objectiveGoal.findUnique({
      where: { id },
    });
    return found ? new ObjectiveGoalEntity(found) : null;
  }

  async findOneActiveByObjectiveId(objectiveId: string) {
    try {
      return await this.prisma.objectiveGoal.findFirst({
        where: { objectiveId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { rangeExceptional: true, rangeInacceptable: true },
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  async findByIdWithObjectiveAndIndicator(id: string) {
    try {
      return await this.prisma.objectiveGoal.findUnique({
        where: { id },
        include: {
          objective: {
            include: {
              indicator: true,
            },
          },
        },
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  async updateComputed(
    id: string,
    data: Prisma.ObjectiveGoalUpdateInput,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const client = tx ?? this.prisma;
      return await client.objectiveGoal.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    } catch (e) {
      console.log(e);
      handleDatabaseErrors(e);
    }
  }

  async insertHistoryFromGoal(
    updated: ObjectiveGoalEntity,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      const client = tx ?? this.prisma;
      await client.objectiveGoalHist.create({
        data: {
          objectiveId: updated.objectiveId,
          month: updated.month,
          year: updated.year,
          goalValue: updated.goalValue,
          goalPercentage: updated.goalPercentage,
          realPercentage: updated.realPercentage,
          realValue: updated.realValue,
          indexCompliance: updated.indexCompliance,
          score: updated.score,
          rangeExceptional: updated.rangeExceptional,
          rangeInacceptable: updated.rangeInacceptable,
          indexPerformance: updated.indexPerformance,
          baseValue: updated.baseValue,
          light: updated.light,
          observation: updated.observation,
          action: updated.action,
          wasActive: updated.isActive,
          archivedBy: userId,
          createdBy: updated.createdBy,
          updatedBy: updated.updatedBy,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }

  async update(
    id: string,
    data: UpdateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    try {
      const updated = await this.prisma.objectiveGoal.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new ObjectiveGoalEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.objectiveGoal.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async inactivateByObjectiveId(objectiveId: string, userId: string) {
    try {
      await this.prisma.objectiveGoal.updateMany({
        where: { objectiveId, isActive: true },
        data: { isActive: false, updatedBy: userId },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createManyForObjective(
    objectiveId: string,
    months: Array<{ month: number; year: number }>,
    goalValue: number | null,
    userId: string,
    opts?: {
      rangeExceptional?: number | null;
      rangeInacceptable?: number | null;
    },
  ) {
    if (!months?.length) return;

    const data: Prisma.ObjectiveGoalCreateManyInput[] = months.map((m) => ({
      objectiveId,
      month: m.month,
      year: m.year,
      goalValue: goalValue ?? null,
      baseValue: goalValue ?? null,
      rangeExceptional: opts?.rangeExceptional ?? null,
      rangeInacceptable: opts?.rangeInacceptable ?? null,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    }));

    try {
      await this.prisma.objectiveGoal.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createManyIfNotExists(
    objectiveId: string,
    months: Array<{ month: number; year: number }>,
    goalValue: number | null,
    userId: string,
    opts?: {
      rangeExceptional?: number | null;
      rangeInacceptable?: number | null;
    },
  ) {
    if (!months?.length) return 0;

    const { count } = await this.prisma.objectiveGoal.createMany({
      data: months.map((m) => ({
        objectiveId,
        month: m.month,
        year: m.year,
        goalValue: goalValue ?? null,
        baseValue: goalValue ?? null,
        rangeExceptional: opts?.rangeExceptional ?? null,
        rangeInacceptable: opts?.rangeInacceptable ?? null,

        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      })),
      skipDuplicates: true, // ← no pisa existentes
    });

    return count; // cantidad realmente insertada
  }

  async findActiveMonthYearList(
    objectiveId: string,
  ): Promise<Array<{ month: number; year: number }>> {
    try {
      const rows = await this.prisma.objectiveGoal.findMany({
        where: { objectiveId, isActive: true },
        select: { month: true, year: true },
      });
      return rows;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async archiveAndDeleteByMonths(
    objectiveId: string,
    months: Array<{ month: number; year: number }>,
    userId: string,
  ): Promise<void> {
    if (!months?.length) return;

    // Construimos un filtro OR por mes/año
    const orFilter = months.map((m) => ({ month: m.month, year: m.year }));

    await this.prisma.$transaction(async (tx) => {
      const toArchive = await tx.objectiveGoal.findMany({
        where: { objectiveId, isActive: true, OR: orFilter },
      });

      if (toArchive.length) {
        await tx.objectiveGoalHist.createMany({
          data: toArchive.map((g) => ({
            objectiveId: g.objectiveId,
            month: g.month,
            year: g.year,
            goalValue: g.goalValue,
            goalPercentage: g.goalPercentage,
            realPercentage: g.realPercentage,
            realValue: g.realValue,
            indexCompliance: g.indexCompliance,
            score: g.score,
            rangeExceptional: g.rangeExceptional,
            rangeInacceptable: g.rangeInacceptable,
            indexPerformance: g.indexPerformance,
            baseValue: g.baseValue,
            light: g.light,
            observation: g.observation,
            action: g.action,
            wasActive: g.isActive,
            archivedBy: userId,
            createdBy: g.createdBy,
            updatedBy: g.updatedBy,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          })),
          skipDuplicates: true,
        });

        await tx.objectiveGoal.deleteMany({
          where: { objectiveId, OR: orFilter },
        });
      }
    });
  }

  async archiveAndReplaceGoals(
    objectiveId: string,
    months: Array<{ month: number; year: number }>,
    goalValue: number | null,
    userId: string,
    opts?: {
      rangeExceptional?: number | null;
      rangeInacceptable?: number | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Traer TODOS los goals actuales (activos/inactivos) para evitar unique conflicts
      const current = await tx.objectiveGoal.findMany({
        where: { objectiveId },
      });

      // 2) Guardarlos en historial
      if (current.length) {
        await tx.objectiveGoalHist.createMany({
          data: current.map((g) => ({
            objectiveId: g.objectiveId,
            month: g.month,
            year: g.year,
            goalValue: g.goalValue,
            goalPercentage: g.goalPercentage,
            realPercentage: g.realPercentage,
            realValue: g.realValue,
            indexCompliance: g.indexCompliance,
            score: g.score,
            rangeExceptional: g.rangeExceptional,
            rangeInacceptable: g.rangeInacceptable,
            indexPerformance: g.indexPerformance,
            baseValue: g.baseValue,
            light: g.light,
            observation: g.observation,
            action: g.action,
            wasActive: g.isActive,
            archivedBy: userId,
            createdBy: g.createdBy,
            updatedBy: g.updatedBy,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          })),
          skipDuplicates: true, // por si se reintenta
        });

        // 3) Borrar todos los actuales para liberar unique (objectiveId,month,year)
        await tx.objectiveGoal.deleteMany({ where: { objectiveId } });
      }

      // 4) Crear los nuevos
      if (months?.length) {
        await tx.objectiveGoal.createMany({
          data: months.map((m) => ({
            objectiveId,
            month: m.month,
            year: m.year,
            goalValue: goalValue ?? null,
            baseValue: goalValue ?? null,
            rangeExceptional: opts?.rangeExceptional ?? null,
            rangeInacceptable: opts?.rangeInacceptable ?? null,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
          })),
          skipDuplicates: false, // ahora no debería haber choques
        });
      }
    });
  }

  async findActiveIdsByObjectiveAndMonths(
    objectiveId: string,
    months: Array<{ month: number; year: number }>,
  ): Promise<string[]> {
    if (!months?.length) return [];
    const orFilter = months.map((m) => ({ month: m.month, year: m.year }));
    const rows = await this.prisma.objectiveGoal.findMany({
      where: { objectiveId, isActive: true, OR: orFilter },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
