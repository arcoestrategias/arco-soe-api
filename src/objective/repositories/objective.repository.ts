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
      console.log(error);
      handleDatabaseErrors(error);
    }
  }

  findAll(
    strategicPlanId: string,
    positionId: string,
    year?: number,
  ): Promise<ObjectiveEntity[]> {
    // Si hay year, armamos rango [1-ene-year, 1-ene-(year+1)) en UTC
    const whereIndicator: any = {
      isConfigured: true,
      isActive: true,
      ...(typeof year === 'number'
        ? {
            periodEnd: {
              gte: new Date(Date.UTC(year, 0, 1)), // 1/ene/year 00:00Z
              lt: new Date(Date.UTC(year + 1, 0, 1)), // 1/ene/(year+1) 00:00Z
            },
          }
        : {}),
    };

    return this.prisma.objective
      .findMany({
        where: {
          strategicPlanId,
          positionId,
          isActive: true,
          indicator: { is: whereIndicator },
        },
        orderBy: { order: 'asc' },
      })
      .then((items) => items.map((o) => new ObjectiveEntity(o)));
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
      console.log(error);
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

  async findActiveAssociations(objectiveId: string): Promise<{
    projects: Array<{
      id: string;
      name: string;
      status: string;
      fromAt: Date | null;
      untilAt: Date | null;
      isActive: boolean;
    }>;
    priorities: Array<{
      id: string;
      name: string;
      status: string;
      fromAt: Date;
      untilAt: Date;
      positionId: string;
      position: { id: string; name: string };
      isActive: boolean;
    }>;
  }> {
    const [projects, priorities] = await this.prisma.$transaction([
      this.prisma.strategicProject.findMany({
        where: { objectiveId, isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          fromAt: true,
          untilAt: true,
          isActive: true,
        },
      }),
      this.prisma.priority.findMany({
        where: { objectiveId, isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          fromAt: true,
          untilAt: true,
          isActive: true,
          positionId: true,
          position: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { projects, priorities };
  }

  async inactivate(id: string, userId: string): Promise<void> {
    await this.prisma.objective.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
  }

  /**
   * Resuelve el contexto mínimo para notificar al responsable de un objetivo.
   * - companyId / businessUnitId (desde la BU de la posición del objetivo)
   * - responsibleUserId (usuario responsable de esa posición)
   */
  async getNotificationScopeByObjective(objectiveId: string) {
    const objective = await this.prisma.objective.findUnique({
      where: { id: objectiveId },
      select: {
        position: {
          select: {
            businessUnit: {
              select: {
                id: true, // businessUnitId
                companyId: true,
              },
            },
            // La relación 'userLinks' en Position nos da el UserBusinessUnit
            // que a su vez nos da el userId del responsable.
            userLinks: {
              select: {
                userId: true,
              },
              take: 1, // Optimización: solo nos interesa el único usuario asignado.
            },
          },
        },
      },
    });

    if (!objective?.position) return null;

    const responsibleUserId = objective.position.userLinks[0]?.userId ?? null;

    return {
      companyId: objective.position.businessUnit?.companyId ?? null,
      businessUnitId: objective.position.businessUnit?.id ?? null,
      responsibleUserId,
    };
  }

  /**
   * Resuelve el contexto mínimo para notificar al responsable de una posición.
   * - companyId / businessUnitId (desde la BU de la posición)
   * - responsibleUserId (usuario responsable de esa posición)
   * Esta es una versión optimizada que realiza una sola consulta a la BD.
   */
  async getNotificationScopeByPosition(positionId: string) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: {
        businessUnit: {
          select: {
            id: true, // businessUnitId
            companyId: true,
          },
        },
        // La relación 'userLinks' en Position nos da el UserBusinessUnit
        // que a su vez nos da el userId del responsable.
        userLinks: {
          select: {
            userId: true,
          },
          take: 1, // Optimización: solo nos interesa el único usuario asignado.
        },
      },
    });

    if (!position) return null;

    const responsibleUserId = position.userLinks[0]?.userId ?? null;

    return {
      companyId: position.businessUnit?.companyId ?? null,
      businessUnitId: position.businessUnit?.id ?? null,
      responsibleUserId,
    };
  }
}
