export class ProjectParticipantEntity {
  readonly id: string;
  readonly projectId: string;
  readonly positionId: string;
  readonly isLeader: boolean;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.projectId = row.projectId;
    this.positionId = row.positionId;
    this.isLeader = Boolean(row.isLeader);

    this.isActive = row.isActive;
    this.createdBy = row.createdBy ?? null;
    this.updatedBy = row.updatedBy ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
