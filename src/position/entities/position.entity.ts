export class PositionEntity {
  readonly id: string;
  readonly name: string;
  readonly businessUnitId: string;
  readonly userId?: string | null;
  readonly strategicPlanId?: string | null;
  readonly mission?: string | null;
  readonly vision?: string | null;
  readonly department?: string | null;
  readonly isCeo: boolean;
  readonly positionSuperiorId?: string | null;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  readonly businessUnitName: string | null;
  readonly userFullName: string | null;

  constructor(position: any) {
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
    this.businessUnitName = position.businessUnitName;
    this.userFullName = position.userFullName;
  }
}
