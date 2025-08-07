export class ObjectiveEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly perspective: 'FIN' | 'CLI' | 'PRO' | 'PER';
  readonly order: number;
  readonly strategicPlanId: string;

  readonly parentId?: string | null;
  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(objective: any) {
    this.id = objective.id;
    this.name = objective.name;
    this.description = objective.description;
    this.perspective = objective.perspective;
    this.order = objective.order;
    this.strategicPlanId = objective.strategicPlanId;
    this.parentId = objective.parentId ?? null;
    this.isActive = objective.isActive;
    this.createdBy = objective.createdBy ?? null;
    this.updatedBy = objective.updatedBy ?? null;
    this.createdAt = objective.createdAt;
    this.updatedAt = objective.updatedAt;
  }
}
