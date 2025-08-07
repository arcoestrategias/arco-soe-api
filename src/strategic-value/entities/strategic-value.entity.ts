export class StrategicValueEntity {
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

  constructor(value: any) {
    this.id = value.id;
    this.name = value.name;
    this.description = value.description;
    this.order = value.order;
    this.strategicPlanId = value.strategicPlanId;
    this.isActive = value.isActive;
    this.createdBy = value.createdBy ?? null;
    this.updatedBy = value.updatedBy ?? null;
    this.createdAt = value.createdAt;
    this.updatedAt = value.updatedAt;
  }
}
