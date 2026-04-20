export class TaskParticipantEntity {
  readonly id: string;
  readonly taskId: string;

  readonly positionId?: string | null;
  readonly positionName?: string | null;
  readonly userId?: string | null;
  readonly userName?: string | null;

  readonly externalUserId?: string | null;
  readonly externalUserName?: string | null;
  readonly externalUserEmail?: string | null;

  readonly isActive: boolean;
  readonly createdAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.taskId = row.taskId;
    this.positionId = row.positionId ?? null;
    this.externalUserId = row.externalUserId ?? null;
    this.isActive = row.isActive;
    this.createdAt = row.createdAt;

    if (row.position) {
      this.positionName = row.position.name ?? null;
      const responsibleUser = row.position.userLinks?.[0]?.user;
      if (responsibleUser) {
        this.userId = responsibleUser.id ?? null;
        this.userName =
          `${responsibleUser.firstName ?? ''} ${responsibleUser.lastName ?? ''}`.trim() ||
          null;
      }
    }

    if (row.externalUser) {
      this.externalUserName = row.externalUser.name ?? null;
      this.externalUserEmail = row.externalUser.email ?? null;
    }
  }
}

export class ProjectTaskEntity {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;

  readonly order: number;
  readonly fromAt: Date;
  readonly untilAt: Date;
  readonly finishedAt?: Date | null;

  readonly status: 'OPE' | 'CLO';
  readonly props: string | null;
  readonly result: string | null;
  readonly methodology: string | null;
  readonly budget: number;
  readonly limitation: string | null;
  readonly comments: string | null;

  readonly projectFactorId: string;
  readonly participants: TaskParticipantEntity[];

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: any) {
    this.id = row.id;
    this.name = row.name;
    this.description = row.description ?? null;

    this.order = row.order;
    this.fromAt = row.fromAt;
    this.untilAt = row.untilAt;
    this.finishedAt = row.finishedAt ?? null;

    this.status = row.status;
    this.props = row.props ?? null;
    this.result = row.result ?? null;
    this.methodology = row.methodology ?? null;
    this.budget = Number(row.budget ?? 0);
    this.limitation = row.limitation ?? null;
    this.comments = row.comments ?? null;

    this.projectFactorId = row.projectFactorId;
    this.participants = row.participants
      ? row.participants.map((p: any) => new TaskParticipantEntity(p))
      : [];

    this.isActive = row.isActive;
    this.createdBy = row.createdBy ?? null;
    this.updatedBy = row.updatedBy ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
