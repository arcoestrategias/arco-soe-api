import { StrategicValueEntity } from '../entities/strategic-value.entity';

export class ResponseStrategicValueDto {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  strategicPlanId: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(value: StrategicValueEntity) {
    this.id = value.id;
    this.name = value.name;
    this.description = value.description;
    this.order = value.order;
    this.strategicPlanId = value.strategicPlanId;
    this.isActive = value.isActive;
    this.createdBy = value.createdBy ?? null;
    this.updatedBy = value.updatedBy ?? null;
    this.createdAt = value.createdAt;
    this.updatedAt = value.updatedAt;
  }
}
