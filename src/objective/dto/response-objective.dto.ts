import { ObjectiveEntity } from '../entities/objective.entity';

export class ResponseObjectiveDto {
  id: string;
  name: string;
  description: string | null;
  perspective: 'FIN' | 'CLI' | 'PRO' | 'PER';
  order: number;
  strategicPlanId: string;
  objectiveParentId: string | null;
  indicatorId: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(entity: ObjectiveEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description ?? null;
    this.perspective = entity.perspective;
    this.order = entity.order;
    this.strategicPlanId = entity.strategicPlanId;
    this.objectiveParentId = entity.objectiveParentId ?? null;
    this.indicatorId = entity.indicatorId ?? null;
    this.isActive = entity.isActive;
    this.createdBy = entity.createdBy ?? null;
    this.updatedBy = entity.updatedBy ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
