export class CompanyEntity {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(company: any) {
    this.id = company.id;
    this.name = company.name;
    this.isActive = company.isActive;
    this.createdBy = company.createdBy ?? null;
    this.updatedBy = company.updatedBy ?? null;
    this.createdAt = company.createdAt;
    this.updatedAt = company.updatedAt;
  }
}
