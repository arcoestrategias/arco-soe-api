export class BusinessUnitEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly ide?: string;
  readonly legalRepresentativeName?: string;
  readonly address?: string;
  readonly phone?: string;
  readonly order?: number;
  readonly isActive: boolean;
  readonly companyId: string;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(unit: any) {
    this.id = unit.id;
    this.name = unit.name;
    this.description = unit.description;
    this.ide = unit.ide;
    this.legalRepresentativeName = unit.legalRepresentativeName;
    this.address = unit.address;
    this.phone = unit.phone;
    this.order = unit.order;
    this.isActive = unit.isActive;
    this.companyId = unit.companyId;
    this.createdBy = unit.createdBy ?? null;
    this.updatedBy = unit.updatedBy ?? null;
    this.createdAt = unit.createdAt;
    this.updatedAt = unit.updatedAt;
  }
}
