export class StrategicPlanEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly order: number;
  readonly period: number;
  readonly fromAt?: Date | null;
  readonly untilAt?: Date | null;
  readonly mission?: string | null;
  readonly vision?: string | null;
  readonly competitiveAdvantage?: string | null;
  readonly status: string;
  readonly businessUnitId: string;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(plan: any) {
    this.id = plan.id;
    this.name = plan.name;
    this.description = plan.description;
    this.order = plan.order;
    this.period = plan.period;
    this.fromAt = plan.fromAt;
    this.untilAt = plan.untilAt;
    this.mission = plan.mission;
    this.vision = plan.vision;
    this.competitiveAdvantage = plan.competitiveAdvantage;
    this.status = plan.status;
    this.businessUnitId = plan.businessUnitId;
    this.isActive = plan.isActive;
    this.createdBy = plan.createdBy ?? null;
    this.updatedBy = plan.updatedBy ?? null;
    this.createdAt = plan.createdAt;
    this.updatedAt = plan.updatedAt;
  }
}
