import { ObjectiveEntity } from '../entities/objective.entity';

export class ResponseObjectiveDto {
  id: string;
  name: string;
  description: string | null;
  order: number;
  perspective: 'FIN' | 'CLI' | 'PRO' | 'PER';
  level: string | null;
  valueOrientation: string | null;
  goalValue: number | null;
  status: string | null;
  positionId: string;
  strategicPlanId: string;
  objectiveParentId: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  indicatorId: string | null;

  constructor(entity: ObjectiveEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description ?? null;
    this.order = entity.order;
    this.perspective = entity.perspective;
    this.level = entity.level;
    this.valueOrientation = entity.valueOrientation;
    this.goalValue = entity.goalValue;
    this.status = entity.status;
    this.positionId = entity.positionId;
    this.strategicPlanId = entity.strategicPlanId;
    this.objectiveParentId = entity.objectiveParentId ?? null;
    this.isActive = entity.isActive;
    this.createdBy = entity.createdBy ?? null;
    this.updatedBy = entity.updatedBy ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.indicatorId = entity.indicatorId ?? null;
  }
}
