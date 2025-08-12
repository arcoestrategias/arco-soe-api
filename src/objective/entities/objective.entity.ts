export class ObjectiveEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly order: number;
  readonly perspective: 'FIN' | 'CLI' | 'PRO' | 'PER';
  readonly level: string;
  readonly valueOrientation: string;
  readonly goalValue: number;
  readonly status: string;

  readonly positionId: string;
  readonly strategicPlanId: string;
  readonly indicatorId?: string | null;

  readonly objectiveParentId?: string | null;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(objective: any) {
    this.id = objective.id;
    this.name = objective.name;
    this.description = objective.description ?? null;
    this.order = objective.order;
    this.perspective = objective.perspective;
    this.level = objective.level;
    this.valueOrientation = objective.valueOrientation;
    this.goalValue = objective.goalValue;
    this.status = objective.status;

    this.positionId = objective.positionId;
    this.strategicPlanId = objective.strategicPlanId;
    this.indicatorId = objective.indicatorId ?? null;
    this.objectiveParentId = objective.objectiveParentId ?? null;

    this.isActive = objective.isActive;
    this.createdBy = objective.createdBy ?? null;
    this.updatedBy = objective.updatedBy ?? null;
    this.createdAt = objective.createdAt;
    this.updatedAt = objective.updatedAt;
  }
}
