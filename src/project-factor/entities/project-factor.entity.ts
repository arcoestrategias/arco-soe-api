export class ProjectFactorEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly result?: string | null;
  readonly projectId: string;
  readonly order: number;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.name = row.name;
    this.description = row.description ?? null;
    this.result = row.result ?? null;
    this.projectId = row.projectId;
    this.order = row.order;

    this.isActive = row.isActive;
    this.createdBy = row.createdBy ?? null;
    this.updatedBy = row.updatedBy ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
