export class ExternalUserEntity {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly companyId: string;
  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.companyId = row.companyId;
    this.isActive = row.isActive;
    this.createdBy = row.createdBy ?? null;
    this.updatedBy = row.updatedBy ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
