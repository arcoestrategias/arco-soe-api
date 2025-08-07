import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import {
  CreateStrategicSuccessFactorDto,
  UpdateStrategicSuccessFactorDto,
  ReorderStrategicSuccessFactorDto,
} from '../dto';
import { StrategicSuccessFactorEntity } from '../entities/strategic-success-factor.entity';

@Injectable()
export class StrategicSuccessFactorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateStrategicSuccessFactorDto,
    userId: string,
  ): Promise<StrategicSuccessFactorEntity> {
    try {
      const count = await this.prisma.strategicSuccessFactor.count({
        where: { strategicPlanId: data.strategicPlanId, isActive: true },
      });

      const factor = await this.prisma.strategicSuccessFactor.create({
        data: {
          ...data,
          order: count + 1,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return new StrategicSuccessFactorEntity(factor);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(
    strategicPlanId: string,
  ): Promise<StrategicSuccessFactorEntity[]> {
    const factors = await this.prisma.strategicSuccessFactor.findMany({
      where: { strategicPlanId, isActive: true },
      orderBy: { order: 'asc' },
    });

    return factors.map((f) => new StrategicSuccessFactorEntity(f));
  }

  async findById(id: string): Promise<StrategicSuccessFactorEntity | null> {
    const factor = await this.prisma.strategicSuccessFactor.findUnique({
      where: { id },
    });

    return factor ? new StrategicSuccessFactorEntity(factor) : null;
  }

  async update(
    id: string,
    data: UpdateStrategicSuccessFactorDto,
    userId: string,
  ): Promise<StrategicSuccessFactorEntity> {
    try {
      const updated = await this.prisma.strategicSuccessFactor.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });

      return new StrategicSuccessFactorEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.strategicSuccessFactor.update({
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
    items: ReorderStrategicSuccessFactorDto[],
    userId: string,
    strategicPlanId: string,
  ): Promise<void> {
    // Validar que todos pertenezcan al plan estratégico
    const validItems = await this.prisma.strategicSuccessFactor.findMany({
      where: {
        id: { in: items.map((i) => i.id) },
        strategicPlanId,
      },
      select: { id: true },
    });

    if (validItems.length !== items.length) {
      throw new BadRequestException(
        'Algunos Factores no pertenecen al plan indicado',
      );
    }

    // Actualización en lote
    const queries = items.map((item) =>
      this.prisma.strategicSuccessFactor.update({
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
