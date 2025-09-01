import { PositionEntity } from '../entities/position.entity';

export class ResponsePositionDto {
  id: string;
  name: string;
  businessUnitId: string;
  userId: string | null;
  strategicPlanId: string | null;
  mission: string | null;
  vision: string | null;
  department: string | null;
  isCeo: boolean;
  positionSuperiorId: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  businessUnitName: string; 
  userFullName: string | null; 

  constructor(position: PositionEntity) {
    this.id = position.id;
    this.name = position.name;
    this.businessUnitId = position.businessUnitId;
    this.userId = position.userId ?? null;
    this.strategicPlanId = position.strategicPlanId ?? null;
    this.mission = position.mission ?? null;
    this.vision = position.vision ?? null;
    this.department = position.department ?? null;
    this.isCeo = position.isCeo;
    this.positionSuperiorId = position.positionSuperiorId ?? null;
    this.isActive = position.isActive;
    this.createdBy = position.createdBy ?? null;
    this.updatedBy = position.updatedBy ?? null;
    this.createdAt = position.createdAt;
    this.updatedAt = position.updatedAt;
    this.businessUnitName = position?.businessUnitName ?? '';
    this.userFullName = position?.userFullName ?? null;
  }
}
