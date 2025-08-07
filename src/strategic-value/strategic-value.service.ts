import { Injectable, NotFoundException } from '@nestjs/common';
import { StrategicValueRepository } from './repositories/strategic-value.repository';
import {
  CreateStrategicValueDto,
  ReorderStrategicValueWrapperDto,
  UpdateStrategicValueDto,
} from './dto';
import { StrategicValueEntity } from './entities/strategic-value.entity';

@Injectable()
export class StrategicValueService {
  constructor(private readonly valueRepo: StrategicValueRepository) {}

  async create(
    dto: CreateStrategicValueDto,
    userId: string,
  ): Promise<StrategicValueEntity> {
    return this.valueRepo.create(dto, userId);
  }

  async findAll(strategicPlanId: string): Promise<StrategicValueEntity[]> {
    return this.valueRepo.findAll(strategicPlanId);
  }

  async findById(id: string): Promise<StrategicValueEntity> {
    const value = await this.valueRepo.findById(id);
    if (!value) throw new NotFoundException('Valor no encontrado');
    return value;
  }

  async update(
    id: string,
    dto: UpdateStrategicValueDto,
    userId: string,
  ): Promise<StrategicValueEntity> {
    const exists = await this.valueRepo.findById(id);
    if (!exists) throw new NotFoundException('Valor no encontrado');
    return this.valueRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.valueRepo.findById(id);
    if (!exists) throw new NotFoundException('Valor no encontrado');
    await this.valueRepo.remove(id, userId);
  }

  async reorder(
    dto: ReorderStrategicValueWrapperDto,
    userId: string,
  ): Promise<void> {
    await this.valueRepo.reorder(dto.items, userId, dto.strategicPlanId);
  }
}
