import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import {
  CreateLeverDto,
  ReorderLeverDto,
  UpdateLeverDto,
} from '../dto';
import { LeverEntity } from '../entities/lever.entity';

@Injectable()
export class LeversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeverDto, userId: string): Promise<LeverEntity> {
    try {
      const count = await this.prisma.lever.count({
        where: { positionId: data.positionId, isActive: true },
      });

      const created = await this.prisma.lever.create({
        data: {
          ...data,
          order: count + 1,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return new LeverEntity(created);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(positionId: string): Promise<LeverEntity[]> {
    try {
      const rows = await this.prisma.lever.findMany({
        where: { positionId, isActive: true },
        orderBy: { order: 'asc' },
      });
      return rows.map((r) => new LeverEntity(r));
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findById(id: string): Promise<LeverEntity | null> {
    try {
      const row = await this.prisma.lever.findUnique({ where: { id } });
      return row ? new LeverEntity(row) : null;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async update(id: string, data: UpdateLeverDto, userId: string): Promise<LeverEntity> {
    try {
      const updated = await this.prisma.lever.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
      return new LeverEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.lever.update({
        where: { id },
        data: { isActive: false, updatedBy: userId },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async reorder(items: ReorderLeverDto[], userId: string, positionId: string): Promise<void> {
    // Validar pertenencia a la misma posición
    const validItems = await this.prisma.lever.findMany({
      where: { id: { in: items.map((i) => i.id) }, positionId },
      select: { id: true },
    });

    if (validItems.length !== items.length) {
      throw new BadRequestException('Algunas Palancas no pertenecen a la posición indicada');
    }

    // Actualización en lote
    const queries = items.map((item) =>
      this.prisma.lever.update({
        where: { id: item.id },
        data: {
          order: item.order,
          isActive: item.isActive,
          updatedBy: userId,
        },
      }),
    );

    try {
      await this.prisma.$transaction(queries);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
