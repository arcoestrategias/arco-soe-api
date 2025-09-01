import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreatePositionDto, UpdatePositionDto } from '../dto';
import { PositionEntity } from '../entities/position.entity';
import { Prisma } from '@prisma/client';

export type PositionWithNames = PositionEntity & {
  businessUnitName: string;
  userFullName: string | null;
};

@Injectable()
export class PositionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildUserFullName(
    user?: {
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      email: string;
    } | null,
  ): string | null {
    if (!user) return null;
    const full = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return full || user.username || user.email || null;
  }

  private mapToWithNames(row: any): PositionWithNames {
    const { businessUnit, user, ...base } = row;
    return {
      ...base,
      businessUnitName: businessUnit?.name ?? '',
      userFullName: this.buildUserFullName(user ?? null),
    };
  }

  async create(
    data: CreatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    try {
      const position = await this.prisma.position.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<PositionWithNames[]> {
    const rows = await this.prisma.position.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        businessUnit: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return rows.map((r) => this.mapToWithNames(r));
  }

  async findAllByBusinessUnitId(
    businessUnitId: string,
  ): Promise<PositionWithNames[]> {
    const rows = await this.prisma.position.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'desc' },
      include: {
        businessUnit: { select: { name: true } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return rows.map((r) => this.mapToWithNames(r));
  }

  async findById(id: string): Promise<PositionEntity | null> {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });
    return position ? new PositionEntity(position) : null;
  }

  async findCeoInBusinessUnit(businessUnitId: string) {
    return this.prisma.position.findFirst({
      where: { businessUnitId, isCeo: true },
      select: { id: true, name: true, businessUnitId: true },
    });
  }

  async update(
    id: string,
    data: UpdatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    try {
      const position = await this.prisma.position.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.position.update({
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

  async createWithTransaction(
    data: CreatePositionDto,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<PositionEntity> {
    try {
      const position = await tx.position.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new PositionEntity(position);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
