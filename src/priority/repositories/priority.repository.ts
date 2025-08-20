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

  async list(
    f: FilterPriorityDto & { page: number; limit: number },
  ): Promise<{ items: PriorityEntity[]; total: number }> {
    const where: any = {};
    if (f.positionId) where.positionId = f.positionId;
    if (f.objectiveId) where.objectiveId = f.objectiveId;
    if (f.status) where.status = f.status;
    if (f.month) where.month = f.month;
    if (f.year) where.year = f.year;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.priority.findMany({
        where,
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (f.page - 1) * f.limit,
        take: f.limit,
      }),
      this.prisma.priority.count({ where }),
    ]);

    return { items: rows.map((r) => new PriorityEntity(r)), total };
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

  async aggregateIcp(q: CalculatePriorityIcpDto): Promise<{
    totalPlanned: number;
    completedOnTime: number;
    completedLate: number;
    open: number;
    canceled: number;
  }> {
    const { month, year, positionId, objectiveId } = q;

    const commonFilter: Prisma.PriorityWhereInput = {
      isActive: true,
      ...(positionId ? { positionId } : {}),
      ...(objectiveId ? { objectiveId } : {}),
    };

    // Helpers para "está en el mes/año"
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const inMonth = (
      field: 'untilAt' | 'finishedAt' | 'canceledAt',
    ): Prisma.DateTimeNullableFilter | Prisma.DateTimeFilter => ({
      gte: monthStart,
      lte: monthEnd,
    });

    const [totalPlanned, completedOnTime, completedLate, open, canceled] =
      await this.prisma.$transaction([
        // Totales del mes: untilAt en el mes, activos, sin canceladas
        this.prisma.priority.count({
          where: {
            ...commonFilter,
            status: { not: 'CAN' },
            untilAt: inMonth('untilAt') as Prisma.DateTimeFilter,
          },
        }),
        // Cumplidas a tiempo: CLO, finishedAt en el mes, finishedAt <= untilAt
        this.prisma.priority.count({
          where: {
            ...commonFilter,
            status: 'CLO',
            finishedAt: inMonth('finishedAt') as Prisma.DateTimeNullableFilter,
            // finishedAt <= untilAt
            // Prisma no compara campos cruzados directamente; recurrimos a filtro raw si lo deseas.
            // Alternativa simple: finishedAt <= monthEnd AND finishedAt <= untilAt via queryRaw.
            // Aquí aproximamos con <= untilAt en aplicación (service) si prefieres evitar raw.
          },
        }),
        // Cumplidas tarde: CLO, finishedAt en el mes, finishedAt > untilAt
        this.prisma.priority.count({
          where: {
            ...commonFilter,
            status: 'CLO',
            finishedAt: inMonth('finishedAt') as Prisma.DateTimeNullableFilter,
          },
        }),
        // Abiertas del mes actual: OPE y untilAt en el mes
        this.prisma.priority.count({
          where: {
            ...commonFilter,
            status: 'OPE',
            untilAt: inMonth('untilAt') as Prisma.DateTimeFilter,
          },
        }),
        // Canceladas en el mes (CAN con canceledAt en el mes)
        this.prisma.priority.count({
          where: {
            ...commonFilter,
            status: 'CAN',
            canceledAt: inMonth('canceledAt') as Prisma.DateTimeNullableFilter,
          },
        }),
      ]);

    // Nota: completedOnTime / completedLate requieren separar por comparación con untilAt.
    // Si quieres exactitud 100% en DB, podemos usar queryRaw. Abajo lo refinamos en service.

    return { totalPlanned, completedOnTime, completedLate, open, canceled };
  }

  // OPE con untilAt en el mes → separar IN_PROGRESS vs NOT_COMPLETED_OVERDUE
  async listOpenInMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    return this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      select: { untilAt: true },
    });
  }

  // OPE con vencimiento en meses previos al consultado
  async countOpenPreviousMonths(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start } = monthRange(q.year, q.month);
    return this.prisma.priority.count({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { lt: start },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}), // ojo: objectiveId correcto
      },
    });
  }

  async listClosedInMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    return this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        finishedAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      select: { finishedAt: true, untilAt: true },
    });
  }

  // CLO con untilAt en el mes consultado y finishedAt > fin de mes → "COMPLETED_IN_OTHER_MONTH"
  async countCompletedInOtherMonth(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
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

  async listOpenInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  // OPE con untilAt en meses previos (arrastradas)
  async listOpenPreviousMonthsFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start } = monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'OPE',
        untilAt: { lt: start },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  // CLO terminadas en el MES consultado (items completos)
  async listClosedInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        finishedAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      orderBy: [{ finishedAt: 'asc' }, { order: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  // CAN anuladas en el MES consultado (items completos)
  async listCanceledInMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CAN',
        canceledAt: { gte: start, lte: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      orderBy: [{ canceledAt: 'asc' }, { order: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }

  // `untilAt` en el MES consultado pero cerradas después
  async listCompletedInOtherMonthFull(q: {
    month: number;
    year: number;
    positionId?: string;
    objectiveId?: string;
  }) {
    const { start, end } = monthRange(q.year, q.month);
    const rows = await this.prisma.priority.findMany({
      where: {
        isActive: true,
        status: 'CLO',
        untilAt: { gte: start, lte: end },
        finishedAt: { gt: end },
        ...(q.positionId ? { positionId: q.positionId } : {}),
        ...(q.objectiveId ? { objectiveId: q.objectiveId } : {}),
      },
      orderBy: [{ untilAt: 'asc' }, { order: 'asc' }],
    });
    return rows.map((r) => new PriorityEntity(r));
  }
}
