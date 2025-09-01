import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateStrategicPlanDto, UpdateStrategicPlanDto } from '../dto';
import { StrategicPlanEntity } from '../entities/strategic-plan.entity';

@Injectable()
export class StrategicPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateStrategicPlanDto,
    userId: string,
  ): Promise<StrategicPlanEntity> {
    try {
      const plan = await this.prisma.strategicPlan.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new StrategicPlanEntity(plan);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<StrategicPlanEntity[]> {
    const plans = await this.prisma.strategicPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return plans.map((p) => new StrategicPlanEntity(p));
  }

  async findAllByBusinessUnitId(
    businessUnitId: string,
  ): Promise<StrategicPlanEntity[]> {
    const plans = await this.prisma.strategicPlan.findMany({
      where: { businessUnitId },
      orderBy: { createdAt: 'asc' },
    });
    return plans.map((p) => new StrategicPlanEntity(p));
  }

  async findById(id: string): Promise<StrategicPlanEntity | null> {
    const plan = await this.prisma.strategicPlan.findUnique({
      where: { id },
    });
    return plan ? new StrategicPlanEntity(plan) : null;
  }

  async update(
    id: string,
    data: UpdateStrategicPlanDto,
    userId: string,
  ): Promise<StrategicPlanEntity> {
    try {
      const plan = await this.prisma.strategicPlan.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new StrategicPlanEntity(plan);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.strategicPlan.update({
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
}
