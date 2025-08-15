import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectTaskEntity } from '../entities/project-task.entity';
import { CreateProjectTaskDto, UpdateProjectTaskDto } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateProjectTaskDto & {
      order: number;
      projectParticipantId: string | null;
      status: 'OPE' | 'CLO';
      props: string | null;
      result: string | null;
      methodology: string | null;
      budget: number;
      limitation: string | null;
      comments: string | null;
      isActive?: boolean;
      createdBy?: string | null;
      updatedBy?: string | null;
    },
  ): Promise<ProjectTaskEntity> {
    const data: Prisma.ProjectTaskUncheckedCreateInput = { ...dto };
    const created = await this.prisma.projectTask.create({ data });
    return new ProjectTaskEntity(created);
  }

  async update(
    id: string,
    dto: UpdateProjectTaskDto & {
      projectParticipantId?: string;
      updatedBy?: string | null;
    },
  ): Promise<ProjectTaskEntity> {
    const data: Prisma.ProjectTaskUncheckedUpdateInput = { ...dto };
    const updated = await this.prisma.projectTask.update({
      where: { id },
      data,
    });
    return new ProjectTaskEntity(updated);
  }

  async setActive(
    id: string,
    isActive: boolean,
    updatedBy?: string | null,
  ): Promise<ProjectTaskEntity> {
    const updated = await this.prisma.projectTask.update({
      where: { id },
      data: { isActive, updatedBy: updatedBy ?? null },
    });
    return new ProjectTaskEntity(updated);
  }

  async findById(id: string): Promise<ProjectTaskEntity | null> {
    const row = await this.prisma.projectTask.findUnique({ where: { id } });
    return row ? new ProjectTaskEntity(row) : null;
  }

  async listByFactor(
    projectFactorId: string,
    opts?: {
      status?: 'OPE' | 'CLO';
      from?: Date;
      until?: Date;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    items: ProjectTaskEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;

    const where: Prisma.ProjectTaskWhereInput = {
      projectFactorId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.from ? { fromAt: { gte: opts.from } } : {}),
      ...(opts?.until ? { untilAt: { lte: opts.until } } : {}),
      ...(typeof opts?.isActive === 'boolean'
        ? { isActive: opts.isActive }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.projectTask.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    return {
      items: rows.map((r) => new ProjectTaskEntity(r)),
      total,
      page,
      limit,
    };
  }

  async getNextOrderForFactor(projectFactorId: string): Promise<number> {
    const last = await this.prisma.projectTask.findFirst({
      where: { projectFactorId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  async bulkReorderByFactor(
    projectFactorId: string,
    items: { id: string; order: number; isActive?: boolean }[],
  ): Promise<ProjectTaskEntity[]> {
    const rows = await this.prisma.projectTask.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, projectFactorId: true },
    });
    const alien = rows.find((r) => r.projectFactorId !== projectFactorId);
    if (alien) {
      throw new Error(
        `Task ${alien.id} does not belong to projectFactorId ${projectFactorId}`,
      );
    }

    const updated = await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.projectTask.update({
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
    return updated.map((u) => new ProjectTaskEntity(u));
  }

  async existsNameInFactor(
    projectFactorId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await this.prisma.projectTask.findFirst({
      where: {
        projectFactorId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }
}
