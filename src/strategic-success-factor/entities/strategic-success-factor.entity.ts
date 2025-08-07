export class StrategicSuccessFactorEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly order: number;
  readonly strategicPlanId: string;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(factor: any) {
    this.id = factor.id;
    this.name = factor.name;
    this.description = factor.description;
    this.order = factor.order;
    this.strategicPlanId = factor.strategicPlanId;
    this.isActive = factor.isActive;
    this.createdBy = factor.createdBy ?? null;
    this.updatedBy = factor.updatedBy ?? null;
    this.createdAt = factor.createdAt;
    this.updatedAt = factor.updatedAt;
  }
}
