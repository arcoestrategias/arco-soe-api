import { ObjectiveGoalEntity } from '../entities/objective-goal.entity';

export class ResponseObjectiveGoalDto {
  id: string;
  month: number;
  year: number;
  goalPercentage: number | null;
  goalValue: number | null;
  realPercentage: number | null;
  realValue: number | null;
  indexCompliance: number | null;
  score: number | null;
  rangeExceptional: number | null;
  rangeInacceptable: number | null;
  indexPerformance: number | null;
  baseValue: number | null;
  light: number | null;
  observation: string | null;
  action: string | null;
  objectiveId: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(entity: ObjectiveGoalEntity) {
    Object.assign(this, entity);
  }
}
