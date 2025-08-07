import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  ReorderObjectiveWrapperDto,
} from './dto';
import { ObjectiveRepository } from './repositories/objective.repository';
import { ObjectiveEntity } from './entities/objective.entity';
import { IndicatorRepository } from 'src/indicator/repositories/indicator.repository';

@Injectable()
export class ObjectiveService {
  constructor(
    private readonly repository: ObjectiveRepository,
    private readonly indicatorRepository: IndicatorRepository,
  ) {}

  async create(
    dto: CreateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    const input = {
      ...dto,
      level: dto.level ?? 'OPE',
      valueOrientation: dto.valueOrientation ?? 'CRE',
    };

    // 1. Crear el objetivo

    const objective = await this.repository.create(input, userId);

    // 2. Crear el indicador asociado
    const indicator = await this.indicatorRepository.create(
      {
        name: `${objective.name}`,
        isDefault: true,
        isConfigured: false,
      },
      userId,
    );

    // 3. Asociar el indicador al objetivo
    return this.repository.update(
      objective.id,
      {
        indicatorId: indicator.id,
      },
      userId,
    );
  }

  async findAll(strategicPlanId: string): Promise<ObjectiveEntity[]> {
    return this.repository.findAll(strategicPlanId);
  }

  async findById(id: string): Promise<ObjectiveEntity> {
    const objective = await this.repository.findById(id);
    if (!objective) {
      throw new NotFoundException('Objetivo no encontrado');
    }
    return objective;
  }

  async update(
    id: string,
    dto: UpdateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    return this.repository.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repository.remove(id, userId);
  }

  async reorder(
    dto: ReorderObjectiveWrapperDto,
    userId: string,
  ): Promise<void> {
    await this.repository.reorder(dto.items, userId, dto.strategicPlanId);
  }
}
