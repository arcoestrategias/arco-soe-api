import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StrategicProjectEntity } from '../entities/strategic-project.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStrategicProjectDto, UpdateStrategicProjectDto } from '../dto';

export type StrategicProjectOrderBy =
  | 'order'
  | 'fromAt'
  | 'untilAt'
  | 'createdAt';

export interface FindStrategicProjectParams {
  strategicPlanId?: string;
  objectiveId?: string;
  q?: string;
  from?: Date;
  until?: Date;
  isActive?: boolean;
  page: number;
  limit: number;
  orderBy: keyof Prisma.StrategicProjectOrderByWithRelationInput;
  orderDir: 'asc' | 'desc';
  positionId?: string;
}

export interface ReorderItem {
  id: string;
  order: number; // 1-based
}

@Injectable()
export class StrategicProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Create / Update / Toggle ----------
  async create(
    dto: CreateStrategicProjectDto & {
      createdBy?: string | null;
      updatedBy?: string | null;
      isActive?: boolean;
    },
  ): Promise<StrategicProjectEntity> {
    const created = await this.prisma.strategicProject.create({ data: dto });
    return new StrategicProjectEntity(created);
  }

  async update(
    id: string,
    dto: UpdateStrategicProjectDto & { updatedBy?: string | null },
  ): Promise<StrategicProjectEntity> {
    const updated = await this.prisma.strategicProject.update({
      where: { id },
      data: dto,
    });
    return new StrategicProjectEntity(updated);
  }

  async setActive(
    id: string,
    isActive: boolean,
    updatedBy?: string | null,
  ): Promise<StrategicProjectEntity> {
    const updated = await this.prisma.strategicProject.update({
      where: { id },
      data: { isActive, updatedBy: updatedBy ?? null },
    });
    return new StrategicProjectEntity(updated);
  }

  // ---------- Get / List ----------
  async findById(id: string): Promise<StrategicProjectEntity | null> {
    const project = await this.prisma.strategicProject.findUnique({
      where: { id },
    });
    return project ? new StrategicProjectEntity(project) : null;
  }

  async findMany(args: FindStrategicProjectParams) {
    const {
      strategicPlanId,
      objectiveId,
      q,
      from,
      until,
      isActive,
      page,
      limit,
      orderBy,
      orderDir,
      positionId,
    } = args;

    const where: Prisma.StrategicProjectWhereInput = {
      ...(strategicPlanId ? { strategicPlanId } : {}),
      ...(objectiveId ? { objectiveId } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(from || until
        ? {
            AND: [
              ...(from ? [{ untilAt: { gte: from } }] : []),
              ...(until ? [{ fromAt: { lte: until } }] : []),
            ],
          }
        : {}),
      ...(positionId
        ? { participants: { some: { positionId } } } // ✅ filtra por posición
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.strategicProject.count({ where }),
      this.prisma.strategicProject.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
        // ✅ Trae el participante mínimo para adjuntar projectParticipantId
        include: {
          participants: positionId
            ? { where: { positionId }, select: { id: true }, take: 1 }
            : { select: { id: true }, take: 1, orderBy: { createdAt: 'asc' } }, // requiere createdAt; si no lo tienes, quita orderBy
        },
      }),
    ]);

    // Normaliza respuesta a tu formato { items, total, page, limit }
    const items = rows.map((row: any) => ({
      ...row,
      participantsLite: row.participants, // para que el service lea [0].id
    }));

    return { items, total, page, limit };
  }

  // ---------- Reorder (bulk transaction) ----------
  async getNextOrderForPlan(strategicPlanId: string): Promise<number> {
    const last = await this.prisma.strategicProject.findFirst({
      where: { strategicPlanId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  async bulkReorderByPlan(
    strategicPlanId: string,
    items: { id: string; order: number; isActive?: boolean }[],
  ): Promise<StrategicProjectEntity[]> {
    // Seguridad: que todos pertenezcan al plan
    const projects = await this.prisma.strategicProject.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, strategicPlanId: true },
    });
    const invalid = projects.find((p) => p.strategicPlanId !== strategicPlanId);
    if (invalid) {
      throw new Error(
        `Project ${invalid.id} does not belong to strategicPlanId ${strategicPlanId}`,
      );
    }

    const updated = await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.strategicProject.update({
          where: { id: i.id },
          data: {
            order: i.order,
            ...(typeof i.isActive === 'boolean'
              ? { isActive: i.isActive }
              : {}),
          },
        }),
      ),
    );
    return updated.map((u) => new StrategicProjectEntity(u));
  }

  // ---------- Helpers de rango ----------
  async getRange(
    projectId: string,
  ): Promise<{ fromAt: Date | null; untilAt: Date | null } | null> {
    if (!projectId) return null;

    const p = await this.prisma.strategicProject.findUnique({
      where: { id: projectId },
      select: { fromAt: true, untilAt: true },
    });

    return p ? { fromAt: p.fromAt, untilAt: p.untilAt } : null;
  }

  // ---------- Agregaciones para progreso ----------
  /**
   * Devuelve, por factor, el total de tareas y cerradas (status = 'CLO')
   * para calcular el avance por FCE y luego promediar el proyecto.
   */
  async getFactorTaskAggregates(projectId: string): Promise<
    Array<{
      projectFactorId: string;
      totalTasks: number;
      closedTasks: number;
    }>
  > {
    // total por factor (solo activos)
    const totals = await this.prisma.projectTask.groupBy({
      by: ['projectFactorId'],
      where: {
        factor: { projectId, isActive: true },
        isActive: true,
      },
      _count: { _all: true },
    });

    // cerradas por factor (solo activos)
    const closed = await this.prisma.projectTask.groupBy({
      by: ['projectFactorId'],
      where: {
        factor: { projectId, isActive: true },
        status: 'CLO',
        isActive: true,
      },
      _count: { _all: true },
    });

    const closedMap = new Map<string, number>(
      closed.map((c) => [c.projectFactorId ?? '', c._count._all]),
    );

    return totals.map((t) => ({
      projectFactorId: t.projectFactorId ?? '',
      totalTasks: t._count._all,
      closedTasks: closedMap.get(t.projectFactorId ?? '') ?? 0,
    }));
  }

  /**
   * Lista factores del proyecto (activos) con counts de tareas (total/closed).
   * Útil si quieres mostrar nombre/orden del FCE junto al avance.
   */
  async listFactorsWithTaskCounts(projectId: string): Promise<
    Array<{
      id: string;
      name: string;
      order: number;
      totalTasks: number;
      closedTasks: number;
    }>
  > {
    const factors = await this.prisma.projectFactor.findMany({
      where: { projectId, isActive: true },
      select: {
        id: true,
        name: true,
        order: true,
        _count: {
          select: { tasks: { where: { isActive: true } } },
        },
        tasks: {
          where: { isActive: true, status: 'CLO' },
          select: { id: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return factors.map((f) => ({
      id: f.id,
      name: f.name,
      order: f.order,
      totalTasks: f._count.tasks,
      closedTasks: f.tasks.length,
    }));
  }

  /**
   * Estructura de proyectos por plan y (opcional) por posición.
   * - Solo proyectos activos (isActive = true).
   * - Incluye: factores activos + tareas activas de cada factor.
   * - Incluye la Position del proyecto para agrupar en el service cuando no se pasa positionId.
   */
  async fetchStructureByPlan(
    strategicPlanId: string,
    positionId?: string,
    opts?: {
      includeInactiveFactors?: boolean;
      includeInactiveTasks?: boolean;
      includeInactiveParticipants?: boolean; // <-- nuevo flag opcional
    },
  ) {
    const where: Prisma.StrategicProjectWhereInput = {
      strategicPlanId,
      isActive: true,
      ...(positionId ? { positionId } : {}),
    };

    const includeInactiveFactors = Boolean(opts?.includeInactiveFactors);
    const includeInactiveTasks = Boolean(opts?.includeInactiveTasks);
    const includeInactiveParticipants = Boolean(
      opts?.includeInactiveParticipants,
    );

    return this.prisma.strategicProject.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        position: true,
        participants: {
          ...(includeInactiveParticipants ? {} : { where: { isActive: true } }),
          orderBy: { createdAt: 'asc' },
          include: {
            position: true, // info de la posición del participante
          },
        },
        factors: {
          ...(includeInactiveFactors ? {} : { where: { isActive: true } }),
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              ...(includeInactiveTasks ? {} : { where: { isActive: true } }),
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async countOverdueByPosition(positionId: string, at: Date): Promise<number> {
    const where: Prisma.StrategicProjectWhereInput = {
      positionId,
      isActive: true,
      canceledAt: null, // no cancelado
      finishedAt: null, // no finalizado
      untilAt: { not: null, lt: at }, // fecha fin pasada
    };

    return this.prisma.strategicProject.count({ where });
  }
}
