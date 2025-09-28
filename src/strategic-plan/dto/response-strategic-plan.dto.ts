import { StrategicPlanEntity } from '../entities/strategic-plan.entity';

export class ResponseStrategicPlanDto {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  period?: number;
  fromAt?: Date | null;
  untilAt?: Date | null;
  mission?: string | null;
  vision?: string | null;
  competitiveAdvantage?: string | null;
  status: string;
  businessUnitId: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(plan: StrategicPlanEntity) {
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
