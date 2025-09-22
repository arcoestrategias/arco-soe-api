import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateObjectiveDto, ReorderObjectiveDto } from '../dto';
import { ObjectiveEntity } from '../entities/objective.entity';
import { Objective, Prisma } from '@prisma/client';

export type ObjectiveWithIndicator = Prisma.ObjectiveGetPayload<{
  include: { indicator: true };
}>;

@Injectable()
export class ObjectiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    try {
      const count = await this.prisma.objective.count({
        where: { strategicPlanId: data.strategicPlanId, isActive: true },
      });

      const objective = await this.prisma.objective.create({
        data: {
          ...data,
          level: data.level ?? 'OPE',
          valueOrientation: data.valueOrientation ?? 'CRE',
          order: count + 1,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return new ObjectiveEntity(objective);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(
    strategicPlanId: string,
    positionId: string,
  ): Promise<ObjectiveEntity[]> {
    const items = await this.prisma.objective.findMany({
      where: { strategicPlanId, positionId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return items.map((o) => new ObjectiveEntity(o));
  }

  async findById(id: string): Promise<ObjectiveEntity | null> {
    const item = await this.prisma.objective.findUnique({
      where: { id },
    });
    return item ? new ObjectiveEntity(item) : null;
  }

  async update(
    id: string,
    data: Partial<Objective>,
    userId: string,
  ): Promise<ObjectiveEntity> {
    try {
      const updated = await this.prisma.objective.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new ObjectiveEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.objective.update({
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
    items: ReorderObjectiveDto[],
    userId: string,
    strategicPlanId: string,
  ): Promise<void> {
    const validItems = await this.prisma.objective.findMany({
      where: {
        id: { in: items.map((i) => i.id) },
        strategicPlanId,
      },
      select: { id: true },
    });

    if (validItems.length !== items.length) {
      throw new BadRequestException(
        'Algunos objetivos no pertenecen al plan indicado',
      );
    }

    const queries = items.map((item) =>
      this.prisma.objective.update({
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

  async findForConfigure(objectiveId: string) {
    try {
      return await this.prisma.objective.findUnique({
        where: { id: objectiveId },
        include: {
          indicator: {
            select: {
              id: true,
              tendence: true,
              measurement: true,
              // agrega lo que necesites comparar/mostrar
            },
          },
        },
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }

  /**
   * Objetivos con indicador NO configurado para un plan y posición.
   * Considera dos casos:
   *  - indicator.isConfigured === false
   *  - indicator inexistente (por si algún dato legacy quedó sin autocreación)
   */
  async findUnconfiguredByPlanAndPosition(params: {
    strategicPlanId: string;
    positionId: string;
  }): Promise<ObjectiveWithIndicator[]> {
    const { strategicPlanId, positionId } = params;
    try {
      return await this.prisma.objective.findMany({
        where: {
          strategicPlanId,
          positionId,
          isActive: true,
          OR: [
            { indicator: { is: { isActive: true, isConfigured: false } } },
            { indicator: { is: null } },
          ],
        },
        include: {
          indicator: true, // toda la info del indicador
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });
    } catch (e) {
      handleDatabaseErrors(e);
    }
  }
}
