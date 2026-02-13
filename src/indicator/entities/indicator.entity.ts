export class IndicatorEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly order: number;
  readonly formula?: string | null;
  readonly isDefault: boolean;
  readonly isConfigured: boolean;

  readonly origin?: string | null;
  readonly tendence?: string | null;
  readonly frequency?: string | null;
  readonly measurement?: string | null;
  readonly type?: string | null;
  readonly reference?: string | null;

  readonly baseValue?: number | null;
  readonly periodStart?: Date | null;
  readonly periodEnd?: Date | null;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(indicator: any) {
    this.id = indicator.id;
    this.name = indicator.name;
    this.description = indicator.description;
    this.order = indicator.order;
    this.formula = indicator.formula;
    this.isDefault = indicator.isDefault;
    this.isConfigured = indicator.isConfigured;

    this.origin = indicator.origin;
    this.tendence = indicator.tendence;
    this.frequency = indicator.frequency;
    this.measurement = indicator.measurement;
    this.type = indicator.type;
    this.reference = indicator.reference;

    this.baseValue = indicator.baseValue ?? 0;
    this.periodStart = indicator.periodStart;
    this.periodEnd = indicator.periodEnd;

    this.isActive = indicator.isActive;
    this.createdBy = indicator.createdBy ?? null;
    this.updatedBy = indicator.updatedBy ?? null;
    this.createdAt = indicator.createdAt;
    this.updatedAt = indicator.updatedAt;
  }
}
