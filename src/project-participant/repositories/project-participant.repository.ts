import { Injectable } from '@nestjs/common';
import { Prisma, ProjectParticipant } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.projectParticipant.findUnique({ where: { id } });
  }

  async findByProjectAndPosition(projectId: string, positionId: string) {
    return this.prisma.projectParticipant.findFirst({
      where: { projectId, positionId },
    });
  }

  async listByProject(
    projectId: string,
    opts?: { page?: number; limit?: number; isActive?: boolean },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const where: Prisma.ProjectParticipantWhereInput = {
      projectId,
      ...(typeof opts?.isActive === 'boolean'
        ? { isActive: opts.isActive }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectParticipant.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectParticipant.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async listByPosition(
    positionId: string,
    opts?: { page?: number; limit?: number; isActive?: boolean },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const where: Prisma.ProjectParticipantWhereInput = {
      positionId,
      ...(typeof opts?.isActive === 'boolean'
        ? { isActive: opts.isActive }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectParticipant.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectParticipant.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async create(dto: {
    projectId: string;
    positionId: string;
    isLeader?: boolean;
    createdBy?: string | null;
  }) {
    return this.prisma.projectParticipant.create({
      data: {
        projectId: dto.projectId,
        positionId: dto.positionId,
        isLeader: Boolean(dto.isLeader),
        isActive: true,
        createdBy: dto.createdBy ?? null,
        updatedBy: null,
      },
    });
  }

  async update(
    id: string,
    dto: {
      positionId?: string;
      isLeader?: boolean;
      isActive?: boolean;
      updatedBy?: string | null;
    },
  ) {
    return this.prisma.projectParticipant.update({
      where: { id },
      data: {
        ...(typeof dto.isLeader === 'boolean'
          ? { isLeader: dto.isLeader }
          : {}),
        ...(typeof dto.isActive === 'boolean'
          ? { isActive: dto.isActive }
          : {}),
        ...(dto.positionId ? { positionId: dto.positionId } : {}),
        updatedBy: dto.updatedBy ?? null,
      },
    });
  }

  async setActive(id: string, isActive: boolean, updatedBy?: string | null) {
    return this.prisma.projectParticipant.update({
      where: { id },
      data: { isActive, updatedBy: updatedBy ?? null },
    });
  }

  async setLeaderExclusive(
    projectId: string,
    participantId: string,
    updatedBy?: string | null,
  ) {
    // Quita líderes del proyecto y fija uno
    await this.prisma.$transaction([
      this.prisma.projectParticipant.updateMany({
        where: { projectId },
        data: { isLeader: false },
      }),
      this.prisma.projectParticipant.update({
        where: { id: participantId },
        data: { isLeader: true, updatedBy: updatedBy ?? null },
      }),
    ]);
  }

  // Helpers usados por otros módulos:
  async findOrCreate(
    projectId: string,
    positionId: string,
  ): Promise<ProjectParticipant> {
    return this.prisma.projectParticipant.upsert({
      where: {
        projectId_positionId: { projectId, positionId },
      },
      update: {},
      create: { projectId, positionId },
    });
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

  async findOwnerForProject(projectId: string) {
    return this.prisma.projectParticipant.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }
}
