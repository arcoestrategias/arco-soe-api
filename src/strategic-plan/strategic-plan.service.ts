import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStrategicPlanDto, UpdateStrategicPlanDto } from './dto';
import { StrategicPlanEntity } from './entities/strategic-plan.entity';
import { StrategicPlanRepository } from './repositories/strategic-plan.repository';

@Injectable()
export class StrategicPlanService {
  constructor(private readonly planRepo: StrategicPlanRepository) {}

  async create(
    dto: CreateStrategicPlanDto,
    userId: string,
  ): Promise<StrategicPlanEntity> {
    return this.planRepo.create(dto, userId);
  }

  async findAll(): Promise<StrategicPlanEntity[]> {
    return this.planRepo.findAll();
  }

  async findAllBybusinessUnitId(
    businessUnitId: string,
  ): Promise<StrategicPlanEntity[]> {
    return this.planRepo.findAllByBusinessUnitId(businessUnitId);
  }

  async findById(id: string): Promise<StrategicPlanEntity> {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw new NotFoundException('Plan estratégico no encontrado');
    return plan;
  }

  async update(
    id: string,
    dto: UpdateStrategicPlanDto,
    userId: string,
  ): Promise<StrategicPlanEntity> {
    const exists = await this.planRepo.findById(id);
    if (!exists) throw new NotFoundException('Plan estratégico no encontrado');
    return this.planRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.planRepo.findById(id);
    if (!exists) throw new NotFoundException('Plan estratégico no encontrado');
    await this.planRepo.remove(id, userId);
  }
}
