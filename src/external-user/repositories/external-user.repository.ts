import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExternalUserEntity } from '../entities/external-user.entity';
import { CreateExternalUserDto, UpdateExternalUserDto } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExternalUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateExternalUserDto & {
      companyId: string;
      createdBy?: string | null;
    },
  ): Promise<ExternalUserEntity> {
    const created = await this.prisma.externalUser.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        companyId: dto.companyId,
        createdBy: dto.createdBy ?? null,
      },
    });
    return new ExternalUserEntity(created);
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateExternalUserDto & { updatedBy?: string | null },
  ): Promise<ExternalUserEntity> {
    const data: Prisma.ExternalUserUpdateInput = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
      ...(dto.updatedBy ? { updatedBy: dto.updatedBy } : {}),
    };

    const updated = await this.prisma.externalUser.update({
      where: { id, companyId },
      data,
    });
    return new ExternalUserEntity(updated);
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<ExternalUserEntity | null> {
    const row = await this.prisma.externalUser.findUnique({
      where: { id, companyId },
    });
    return row ? new ExternalUserEntity(row) : null;
  }

  async findByEmail(
    email: string,
    companyId: string,
  ): Promise<ExternalUserEntity | null> {
    const row = await this.prisma.externalUser.findUnique({
      where: { companyId_email: { companyId, email: email.toLowerCase() } },
    });
    return row ? new ExternalUserEntity(row) : null;
  }

  async findOrCreate(
    name: string,
    email: string,
    companyId: string,
    createdBy?: string | null,
  ): Promise<{ externalUser: ExternalUserEntity; wasCreated: boolean }> {
    const existing = await this.findByEmail(email, companyId);
    if (existing) {
      return { externalUser: existing, wasCreated: false };
    }

    const created = await this.prisma.externalUser.create({
      data: {
        name,
        email: email.toLowerCase(),
        companyId,
        createdBy: createdBy ?? null,
      },
    });
    return { externalUser: new ExternalUserEntity(created), wasCreated: true };
  }

  async findMany(opts?: {
    companyId: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: ExternalUserEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;

    const where: Prisma.ExternalUserWhereInput = {
      companyId: opts?.companyId,
      ...(typeof opts?.isActive === 'boolean'
        ? { isActive: opts.isActive }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.externalUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.externalUser.count({ where }),
    ]);

    return {
      items: rows.map((r) => new ExternalUserEntity(r)),
      total,
      page,
      limit,
    };
  }
}
