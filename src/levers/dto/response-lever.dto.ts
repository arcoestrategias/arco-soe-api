import { LeverEntity } from '../entities/lever.entity';

export class ResponseLeverDto {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  positionId: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(e: LeverEntity) {
    this.id = e.id;
    this.name = e.name;
    this.description = e.description;
    this.order = e.order;
    this.positionId = e.positionId;
    this.isActive = e.isActive;
    this.createdBy = e.createdBy ?? null;
    this.updatedBy = e.updatedBy ?? null;
    this.createdAt = e.createdAt;
    this.updatedAt = e.updatedAt;
  }
}
