export class StrategicProjectEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly fromAt: Date;
  readonly untilAt: Date;
  readonly budget: number;
  readonly order: number;
  readonly strategicPlanId: string;
  readonly objectiveId?: string | null;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // Campo calculado (no en BD)
  readonly progress?: number;

  constructor(project: any) {
    this.id = project.id;
    this.name = project.name;
    this.description = project.description ?? null;
    this.fromAt = project.fromAt;
    this.untilAt = project.untilAt;
    this.budget = Number(project.budget ?? 0);
    this.order = project.order;
    this.strategicPlanId = project.strategicPlanId;
    this.objectiveId = project.objectiveId ?? null;

    this.isActive = project.isActive;
    this.createdBy = project.createdBy ?? null;
    this.updatedBy = project.updatedBy ?? null;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;

    if (typeof project.progress === 'number') {
      this.progress = project.progress;
    }
  }
}
