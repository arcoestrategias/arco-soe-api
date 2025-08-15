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
  readonly projectParticipantId?: string | null;

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
    this.projectParticipantId = row.projectParticipantId ?? null;

    this.isActive = row.isActive;
    this.createdBy = row.createdBy ?? null;
    this.updatedBy = row.updatedBy ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
