import { StrategicSuccessFactorEntity } from '../entities/strategic-success-factor.entity';

export class ResponseStrategicSuccessFactorDto {
  id: string;
  name: string;
  description: string | null;
  order: number;
  strategicPlanId: string;

  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(entity: StrategicSuccessFactorEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description ?? null;
    this.order = entity.order;
    this.strategicPlanId = entity.strategicPlanId;
    this.isActive = entity.isActive;
    this.createdBy = entity.createdBy ?? null;
    this.updatedBy = entity.updatedBy ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
