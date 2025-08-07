import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import {
  CreateStrategicValueDto,
  ReorderStrategicValueDto,
  UpdateStrategicValueDto,
} from '../dto';
import { StrategicValueEntity } from '../entities/strategic-value.entity';

@Injectable()
export class StrategicValueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateStrategicValueDto,
    userId: string,
  ): Promise<StrategicValueEntity> {
    try {
      const count = await this.prisma.strategicValue.count({
        where: { strategicPlanId: data.strategicPlanId, isActive: true },
      });

      const value = await this.prisma.strategicValue.create({
        data: {
          ...data,
          order: count + 1,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return new StrategicValueEntity(value);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(strategicPlanId: string): Promise<StrategicValueEntity[]> {
    const values = await this.prisma.strategicValue.findMany({
      where: { strategicPlanId: strategicPlanId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return values.map((v) => new StrategicValueEntity(v));
  }

  async findById(id: string): Promise<StrategicValueEntity | null> {
    const value = await this.prisma.strategicValue.findUnique({
      where: { id },
    });
    return value ? new StrategicValueEntity(value) : null;
  }

  async update(
    id: string,
    data: UpdateStrategicValueDto,
    userId: string,
  ): Promise<StrategicValueEntity> {
    try {
      const updated = await this.prisma.strategicValue.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new StrategicValueEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.strategicValue.update({
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

  async reorder(
    items: ReorderStrategicValueDto[],
    userId: string,
    strategicPlanId: string,
  ): Promise<void> {
    // Validar que todos pertenezcan al plan estratégico
    const validItems = await this.prisma.strategicValue.findMany({
      where: {
        id: { in: items.map((i) => i.id) },
        strategicPlanId,
      },
      select: { id: true },
    });

    if (validItems.length !== items.length) {
      throw new BadRequestException(
        'Algunos Valores no pertenecen al plan indicado',
      );
    }

    // Actualización en lote
    const queries = items.map((item) =>
      this.prisma.strategicValue.update({
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
