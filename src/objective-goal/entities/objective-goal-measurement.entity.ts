import { Decimal } from '@prisma/client/runtime/library';

export class ObjectiveGoalMeasurementEntity {
  readonly id: string;
  readonly objectiveGoalId: string;
  readonly index: number;
  readonly result: Decimal | null;
  readonly measuredAt: Date;
  readonly observation: string | null;
  readonly isIgnore: boolean;
  readonly isActive: boolean;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.objectiveGoalId = row.objectiveGoalId;
    this.index = row.index;
    this.result = row.result;
    this.measuredAt = row.measuredAt;
    this.observation = row.observation;
    this.isIgnore = row.isIgnore;
    this.isActive = row.isActive;
    this.createdBy = row.createdBy;
    this.updatedBy = row.updatedBy;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
