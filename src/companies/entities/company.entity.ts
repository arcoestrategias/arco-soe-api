export class CompanyEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly ide: string;
  readonly legalRepresentativeName: string;
  readonly address?: string;
  readonly phone?: string;
  readonly order?: number;
  readonly isPrivate?: boolean;
  readonly isGroup?: boolean;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(company: any) {
    this.id = company.id;
    this.name = company.name;
    this.description = company.description;
    this.ide = company.ide;
    this.legalRepresentativeName = company.legalRepresentativeName;
    this.address = company.address;
    this.phone = company.phone;
    this.order = company.order;
    this.isPrivate = company.isPrivate;
    this.isGroup = company.isGroup;
    this.isActive = company.isActive;
    this.createdBy = company.createdBy ?? null;
    this.updatedBy = company.updatedBy ?? null;
    this.createdAt = company.createdAt;
    this.updatedAt = company.updatedAt;
  }
}
