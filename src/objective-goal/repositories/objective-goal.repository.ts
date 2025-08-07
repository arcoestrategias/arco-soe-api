import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateObjectiveGoalDto, UpdateObjectiveGoalDto } from '../dto';
import { ObjectiveGoalEntity } from '../entities/objective-goal.entity';

@Injectable()
export class ObjectiveGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    try {
      const created = await this.prisma.objectiveGoal.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new ObjectiveGoalEntity(created);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async createMany(
    items: CreateObjectiveGoalDto[],
    userId: string,
  ): Promise<ObjectiveGoalEntity[]> {
    try {
      const queries = items.map((data) =>
        this.prisma.objectiveGoal.create({
          data: {
            ...data,
            createdBy: userId,
            updatedBy: userId,
          },
        }),
      );

      const created = await this.prisma.$transaction(queries);
      return created.map((g) => new ObjectiveGoalEntity(g));
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findById(id: string): Promise<ObjectiveGoalEntity | null> {
    const found = await this.prisma.objectiveGoal.findUnique({
      where: { id },
    });
    return found ? new ObjectiveGoalEntity(found) : null;
  }

  async update(
    id: string,
    data: UpdateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    try {
      const updated = await this.prisma.objectiveGoal.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new ObjectiveGoalEntity(updated);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.objectiveGoal.update({
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
