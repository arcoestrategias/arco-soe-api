import { StrategicProjectEntity } from '../entities/strategic-project.entity';

export class ResponseStrategicProjectDto {
  constructor(entity: StrategicProjectEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.fromAt = entity.fromAt;
    this.untilAt = entity.untilAt;
    this.order = entity.order;
    this.strategicPlanId = entity.strategicPlanId;
    this.objectiveId = entity.objectiveId;
    this.isActive = entity.isActive;
    this.createdBy = entity.createdBy;
    this.updatedBy = entity.updatedBy;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.progress = entity.progress ?? null;
    this.status = entity.status ?? null;
  }

  id: string;
  name: string;
  description?: string | null;
  fromAt: Date;
  untilAt: Date;
  order: number;
  strategicPlanId: string;
  objectiveId?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  progress?: number | null;
  status?: string | null;
}
