import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ProjectTaskEntity,
  TaskParticipantEntity,
} from '../entities/project-task.entity';
import { CreateProjectTaskDto, UpdateProjectTaskDto } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  private participantsInclude = {
    where: { isActive: true },
    include: {
      position: {
        include: {
          userLinks: {
            where: { isResponsible: true },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
      externalUser: {
        select: { id: true, name: true, email: true },
      },
    },
  };

  async create(
    dto: CreateProjectTaskDto & {
      order: number;
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
    const { participants: _p, ...taskData } = dto as any;
    const data: Prisma.ProjectTaskUncheckedCreateInput = { ...taskData };
    const created = await this.prisma.projectTask.create({
      data,
      include: { participants: this.participantsInclude },
    });
    return new ProjectTaskEntity(created);
  }

  async update(
    id: string,
    dto: UpdateProjectTaskDto & {
      updatedBy?: string | null;
    },
  ): Promise<ProjectTaskEntity> {
    const { participants: _p, ...taskData } = dto as any;
    const data: Prisma.ProjectTaskUncheckedUpdateInput = { ...taskData };
    const updated = await this.prisma.projectTask.update({
      where: { id },
      data,
      include: { participants: this.participantsInclude },
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

  async findById(
    id: string,
    companyId?: string,
  ): Promise<ProjectTaskEntity | null> {
    const row = await this.prisma.projectTask.findUnique({
      where: { id },
      include: {
        participants: companyId
          ? {
              where: { isActive: true },
              include: {
                position: {
                  include: {
                    userLinks: {
                      where: { isResponsible: true },
                      include: {
                        user: {
                          select: { id: true, firstName: true, lastName: true },
                        },
                      },
                    },
                  },
                },
                externalUser: {
                  where: { companyId },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    companyId: true,
                  },
                },
              },
            }
          : this.participantsInclude,
      },
    });
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
        include: { participants: this.participantsInclude },
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

  async addParticipants(
    taskId: string,
    participants: { positionId?: string; externalUserId?: string }[],
    companyId?: string,
    createdBy?: string | null,
  ): Promise<TaskParticipantEntity[]> {
    const data = participants
      .filter((p) => p.positionId || p.externalUserId)
      .map((p) => ({
        taskId,
        positionId: p.positionId ?? null,
        externalUserId: p.externalUserId ?? null,
        isActive: true,
        createdBy,
      }));

    if (data.length === 0) return [];

    const existingParticipants =
      await this.prisma.projectTaskParticipant.findMany({
        where: { taskId },
        select: { positionId: true, externalUserId: true },
      });

    const filteredData = data.filter((p) => {
      const exists = existingParticipants.some(
        (e) =>
          (p.positionId && e.positionId === p.positionId) ||
          (p.externalUserId && e.externalUserId === p.externalUserId),
      );
      return !exists;
    });

    if (filteredData.length === 0) {
      return this.getParticipants(taskId, companyId);
    }

    const created =
      await this.prisma.projectTaskParticipant.createManyAndReturn({
        data: filteredData,
      });
    return created.map((p) => new TaskParticipantEntity(p));
  }

  async removeParticipant(participantId: string): Promise<void> {
    await this.prisma.projectTaskParticipant.update({
      where: { id: participantId },
      data: { isActive: false },
    });
  }

  async setParticipants(
    taskId: string,
    participants: { positionId?: string; externalUserId?: string }[],
    companyId?: string,
    createdBy?: string | null,
  ): Promise<TaskParticipantEntity[]> {
    await this.prisma.projectTaskParticipant.deleteMany({
      where: { taskId },
    });

    if (participants.length === 0) return [];

    return this.addParticipants(taskId, participants, companyId, createdBy);
  }

  async getParticipants(
    taskId: string,
    companyId?: string,
  ): Promise<TaskParticipantEntity[]> {
    const rows = await this.prisma.projectTaskParticipant.findMany({
      where: {
        taskId,
        isActive: true,
        ...(companyId ? { externalUser: { companyId } } : {}),
      },
      include: {
        position: {
          include: {
            userLinks: {
              where: { isResponsible: true },
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
        externalUser: {
          where: companyId ? { companyId } : undefined,
          select: { id: true, name: true, email: true, companyId: true },
        },
      },
    });
    return rows.map((p) => new TaskParticipantEntity(p));
  }

  async getProjectIdByFactorId(
    projectFactorId: string,
  ): Promise<string | null> {
    const factor = await this.prisma.projectFactor.findUnique({
      where: { id: projectFactorId },
      select: { projectId: true },
    });
    return factor?.projectId ?? null;
  }

  async deactivateParticipantsByPosition(positionId: string): Promise<number> {
    const result = await this.prisma.projectTaskParticipant.updateMany({
      where: { positionId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async deactivateParticipantsByExternalUser(
    externalUserId: string,
  ): Promise<number> {
    const result = await this.prisma.projectTaskParticipant.updateMany({
      where: { externalUserId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }
}
