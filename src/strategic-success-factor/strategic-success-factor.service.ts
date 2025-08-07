import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateStrategicSuccessFactorDto,
  UpdateStrategicSuccessFactorDto,
  ReorderStrategicSuccessFactorWrapperDto,
} from './dto';
import { StrategicSuccessFactorsRepository } from './repositories/strategic-success-factors.repository';
import { StrategicSuccessFactorEntity } from './entities/strategic-success-factor.entity';

@Injectable()
export class StrategicSuccessFactorsService {
  constructor(
    private readonly repositorySuccessFactors: StrategicSuccessFactorsRepository,
  ) {}

  async create(
    dto: CreateStrategicSuccessFactorDto,
    userId: string,
  ): Promise<StrategicSuccessFactorEntity> {
    return this.repositorySuccessFactors.create(dto, userId);
  }

  async findAll(
    strategicPlanId: string,
  ): Promise<StrategicSuccessFactorEntity[]> {
    return this.repositorySuccessFactors.findAll(strategicPlanId);
  }

  async findById(id: string): Promise<StrategicSuccessFactorEntity> {
    const factor = await this.repositorySuccessFactors.findById(id);
    if (!factor) {
      throw new NotFoundException('Factor no encontrado');
    }
    return factor;
  }

  async update(
    id: string,
    dto: UpdateStrategicSuccessFactorDto,
    userId: string,
  ): Promise<StrategicSuccessFactorEntity> {
    const exists = await this.repositorySuccessFactors.findById(id);
    if (!exists) throw new NotFoundException('Factor no encontrado');
    return this.repositorySuccessFactors.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.repositorySuccessFactors.findById(id);
    if (!exists) throw new NotFoundException('Factor no encontrado');
    await this.repositorySuccessFactors.remove(id, userId);
  }

  async reorder(
    dto: ReorderStrategicSuccessFactorWrapperDto,
    userId: string,
  ): Promise<void> {
    await this.repositorySuccessFactors.reorder(
      dto.items,
      userId,
      dto.strategicPlanId,
    );
  }
}
