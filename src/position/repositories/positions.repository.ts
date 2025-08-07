import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreatePositionDto, UpdatePositionDto } from '../dto';
import { PositionEntity } from '../entities/position.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PositionsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(): Promise<PositionEntity[]> {
    const positions = await this.prisma.position.findMany({
      where: { isActive: true },
    });
    return positions.map((p) => new PositionEntity(p));
  }

  async findById(id: string): Promise<PositionEntity | null> {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });
    return position ? new PositionEntity(position) : null;
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
