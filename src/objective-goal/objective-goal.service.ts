import { Injectable } from '@nestjs/common';
import { ObjectiveGoalRepository } from './repositories/objective-goal.repository';
import { CreateObjectiveGoalDto, UpdateObjectiveGoalDto } from './dto';
import { ObjectiveGoalEntity } from './entities/objective-goal.entity';

@Injectable()
export class ObjectiveGoalService {
  constructor(private readonly repository: ObjectiveGoalRepository) {}

  async create(
    dto: CreateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    return this.repository.create(dto, userId);
  }

  async createMany(
    dtos: CreateObjectiveGoalDto[],
    userId: string,
  ): Promise<ObjectiveGoalEntity[]> {
    return this.repository.createMany(dtos, userId);
  }

  async findById(id: string): Promise<ObjectiveGoalEntity | null> {
    return this.repository.findById(id);
  }

  async update(
    id: string,
    dto: UpdateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    return this.repository.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repository.remove(id, userId);
  }
}
