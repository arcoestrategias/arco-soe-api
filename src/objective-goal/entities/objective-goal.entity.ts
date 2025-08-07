export class ObjectiveGoalEntity {
  readonly id: string;
  readonly month: number;
  readonly year: number;

  readonly goalPercentage?: number | null;
  readonly goalValue?: number | null;
  readonly realPercentage?: number | null;
  readonly realValue?: number | null;
  readonly indexCompliance?: number | null;
  readonly score?: number | null;
  readonly rangeExceptional?: number | null;
  readonly rangeInacceptable?: number | null;
  readonly indexPerformance?: number | null;
  readonly baseValue?: number | null;
  readonly light?: number | null;

  readonly observation?: string | null;
  readonly action?: string | null;

  readonly objectiveId: string;
  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(goal: any) {
    this.id = goal.id;
    this.month = goal.month;
    this.year = goal.year;

    this.goalPercentage = goal.goalPercentage;
    this.goalValue = goal.goalValue;
    this.realPercentage = goal.realPercentage;
    this.realValue = goal.realValue;
    this.indexCompliance = goal.indexCompliance;
    this.score = goal.score;
    this.rangeExceptional = goal.rangeExceptional;
    this.rangeInacceptable = goal.rangeInacceptable;
    this.indexPerformance = goal.indexPerformance;
    this.baseValue = goal.baseValue;
    this.light = goal.light;

    this.observation = goal.observation;
    this.action = goal.action;

    this.objectiveId = goal.objectiveId;
    this.isActive = goal.isActive;
    this.createdBy = goal.createdBy ?? null;
    this.updatedBy = goal.updatedBy ?? null;
    this.createdAt = goal.createdAt;
    this.updatedAt = goal.updatedAt;
  }
}
