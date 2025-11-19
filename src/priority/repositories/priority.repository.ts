import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePriorityDto } from '../dto/create-priority.dto';
import { UpdatePriorityDto } from '../dto/update-priority.dto';
import { FilterPriorityDto } from '../dto/filter-priority.dto';
import { PriorityEntity } from '../entities/priority.entity';
import { CalculatePriorityIcpDto } from '../dto';
import { Prisma } from '@prisma/client';

// Helper local para rango del mes
function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

@Injectable()
export class PriorityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePriorityDto,
    userId: string,
  ): Promise<PriorityEntity> {
    const data: any = {
      ...dto,
      status: dto.status ?? 'OPE',
      createdBy: userId,
      updatedBy: userId,
    };
    const row = await this.prisma.priority.create({ data });
    return new PriorityEntity(row);
  }

  async update(
    id: string,
    dto: UpdatePriorityDto,
    userId: string,
  ): Promise<PriorityEntity> {
    const data: any = { ...dto, updatedBy: userId };
    const row = await this.prisma.priority.update({ where: { id }, data });
    return new PriorityEntity(row);
  }

  async findById(id: string): Promise<PriorityEntity | null> {
    const row = await this.prisma.priority.findUnique({ where: { id } });
    return row ? new PriorityEntity(row) : null;
  }

  async reorder(items: { id: string; order: number }[]): Promise<void> {
    if (!items?.length) return;
    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.priority.update({
          where: { id: i.id },
          data: { order: i.order },
        }),
      ),
    );
  }

  // Útil si quieres devolver los actualizados (p. ej. para tu controller de reorder)
  async reorderReturn(
    items: { id: string; order: number }[],
  ): Promise<PriorityEntity[]> {
    if (!items?.length) return [];
    await this.reorder(items);
    const ids = items.map((i) => i.id);
    const rows = await this.prisma.priority.findMany({
      where: { id: { in: ids } },
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    userId: string,
  ): Promise<PriorityEntity> {
    const row = await this.prisma.priority.update({
      where: { id },
      data: { isActive, updatedBy: userId },
    });
    return new PriorityEntity(row);
  }

  /**
   * Devuelve el rango UTC del mes:
   * - start: 1er día 00:00:00.000 UTC
   * - end:   último día 23:59:59.999 UTC
   */
  private monthRange(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
  }

  // ============================================================
  // ===============   MÉTODOS "FULL" (para UI)   ===============
  // ============================================================

  /** OPE con untilAt dentro del mes consultado (entidades completas) */
  async listOpenInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      include: { objective: { select: { id: true, name: true } } },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  /** OPE con untilAt en meses anteriores al consultado (entidades completas) */
  async listOpenPreviousMonthsFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start } = this.monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { lt: start },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      include: { objective: { select: { id: true, name: true } } },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  /** CLO con finishedAt dentro del mes consultado (entidades completas) */
  async listClosedInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        finishedAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      include: { objective: { select: { id: true, name: true } } },
      orderBy: [{ finishedAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  /** CAN con canceledAt dentro del mes consultado (entidades completas) */
  async listCanceledInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CAN',
        canceledAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      include: { objective: { select: { id: true, name: true } } },
      orderBy: [{ canceledAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  /** CLO planificadas en el mes (untilAt ∈ M) pero cerradas DESPUÉS del mes (finishedAt > end(M)) */
  async listCompletedInOtherMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        untilAt: { gte: start, lte: end },
        finishedAt: { gt: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      include: { objective: { select: { id: true, name: true } } },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  // ============================================================
  // ======  MÉTODOS "SELECT/COUNT" (compatibilidad/ICP)  =======
  // ============================================================

  /** Select mínimo para ICP: cerradas en el mes (solo fechas) */
  async listClosedInMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    return this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        finishedAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      select: { id: true, untilAt: true, finishedAt: true },
    });
  }

  /** Select mínimo para ICP: abiertas del mes (solo fecha límite) */
  async listOpenInMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    return this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      select: { id: true, untilAt: true },
    });
  }

  /** Conteo: abiertas arrastradas (untilAt < comienzo de mes) */
  async countOpenPreviousMonths(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start } = this.monthRange(q.year, q.month);
    return this.prisma.priority.count({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { lt: start },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
    });
  }

  /** Conteo: due en el mes pero cerradas después del mes */
  async countCompletedInOtherMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    return this.prisma.priority.count({
      where: {
        isActive: true,
        status: 'CLO',
        untilAt: { gte: start, lte: end },
        finishedAt: { gt: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
    });
  }

  /**
   * Agregado simple para obtener canceladas en el mes (informativo).
   * Si ya necesitas más agregados, amplía este método.
   */
  async aggregateIcp(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = this.monthRange(q.year, q.month);
    const canceled = await this.prisma.priority.count({
      where: {
        isActive: true,
        status: 'CAN',
        canceledAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
    });
    return { canceled };
  }

  // ============================================================
  // ===============  LIST genérico (fallback)  =================
  // ============================================================

  /**
   * Listado genérico con paginación (fallback para casos sin mes/año).
   * Si pasas month/year, filtra en ese mes; si no, trae todo paginado.
   */
  async list(params: {
    page: number;
    limit: number;
    month?: number;
    year?: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { page, limit, month, year, positionId, objectiveId } = params;
    const where: any = { isActive: true };
    if (positionId) where.positionId = positionId;
    if (objectiveId) where.objectiveId = objectiveId;
    if (month && year) {
      const { start, end } = this.monthRange(year, month);
      where.untilAt = { gte: start, lte: end };
    }

    const [items, total] = await Promise.all([
      this.prisma.priority.findMany({
        where,
        include: { objective: { select: { id: true, name: true } } },
        orderBy: [{ untilAt: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.priority.count({ where }),
    ]);

    return {
      items: items.map(
        (i) =>
          new PriorityEntity({
            ...i,
            objectiveName: i.objective?.name ?? null,
          }),
      ),
      total,
    };
  }

  // === Notificaciones: helpers de scope (Prisma only) ===

  /**
   * Resuelve el contexto mínimo para notificar a dueño de una posición:
   * - companyId / businessUnitId (desde la BU de la posición)
   * - responsibleUserId (usuario responsable de esa posición)
   */
  async getNotificationScopeByPosition(positionId: string) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: { businessUnitId: true },
    });
    if (!position) return null;

    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: position.businessUnitId },
      select: { id: true, companyId: true },
    });

    const userBusinessUnit = await this.prisma.userBusinessUnit.findFirst({
      where: { positionId },
      select: { userId: true },
    });

    return {
      companyId: businessUnit?.companyId ?? null,
      businessUnitId: businessUnit?.id ?? null,
      responsibleUserId: userBusinessUnit?.userId ?? null,
    };
  }

  /**
   * Resuelve el contexto mínimo para notificar a partir de una prioridad:
   * Incluye datos básicos de la prioridad (nombre y fecha de vencimiento).
   */
  async getNotificationScopeByPriority(priorityId: string) {
    const priority = await this.prisma.priority.findUnique({
      where: { id: priorityId },
      select: { id: true, name: true, untilAt: true, positionId: true },
    });
    if (!priority) return null;

    const scope = await this.getNotificationScopeByPosition(
      priority.positionId,
    );
    return {
      ...scope,
      priorityId: priority.id,
      priorityName: priority.name,
      dueDate: priority.untilAt ?? null,
    };
  }

  /** Select ligero por id (útil para comparar fechas previas). */
  async findLightById(priorityId: string) {
    return this.prisma.priority.findUnique({
      where: { id: priorityId },
      select: {
        id: true,
        name: true,
        untilAt: true,
        status: true,
        positionId: true,
      },
    });
  }
}
