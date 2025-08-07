import { IndicatorEntity } from '../entities/indicator.entity';

export class ResponseIndicatorDto {
  id: string;
  name: string;
  description: string | null;
  order: number;
  formula: string | null;
  isDefault: boolean;
  isConfigured: boolean;
  origin: string | null;
  tendence: string | null;
  frequency: string | null;
  measurement: string | null;
  type: string | null;
  reference: string | null;
  fromAt: Date | null;
  untilAt: Date | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(entity: IndicatorEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description ?? null;
    this.order = entity.order;
    this.formula = entity.formula ?? null;
    this.isDefault = entity.isDefault;
    this.isConfigured = entity.isConfigured;
    this.origin = entity.origin ?? null;
    this.tendence = entity.tendence ?? null;
    this.frequency = entity.frequency ?? null;
    this.measurement = entity.measurement ?? null;
    this.type = entity.type ?? null;
    this.reference = entity.reference ?? null;
    this.fromAt = entity.fromAt ?? null;
    this.untilAt = entity.untilAt ?? null;
    this.isActive = entity.isActive;
    this.createdBy = entity.createdBy ?? null;
    this.updatedBy = entity.updatedBy ?? null;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
