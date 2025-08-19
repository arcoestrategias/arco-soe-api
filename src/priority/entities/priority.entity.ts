import {
  PriorityStatus,
  MonthlyClass,
} from './../../priority/types/priority.types';

export class PriorityEntity {
  readonly id: string;
  readonly isActive: boolean;

  readonly name: string;
  readonly description?: string | null;
  readonly order: number;

  readonly fromAt: Date;
  readonly untilAt: Date;
  readonly finishedAt?: Date | null;
  readonly canceledAt?: Date | null;

  readonly month?: number | null;
  readonly year?: number | null;

  // OPE | CLO | CAN
  readonly status: PriorityStatus;

  readonly positionId: string;
  readonly objectiveId?: string | null;

  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // ---- Derivado (NO persiste en DB) ----
  readonly monthlyClass?: MonthlyClass;

  constructor(priority: any) {
    this.id = priority.id;
    this.isActive = Boolean(priority.isActive);

    this.name = priority.name;
    this.description = priority.description ?? null;
    this.order = Number(priority.order ?? 0);

    this.fromAt = new Date(priority.fromAt);
    this.untilAt = new Date(priority.untilAt);
    this.finishedAt = priority.finishedAt
      ? new Date(priority.finishedAt)
      : null;
    this.canceledAt = priority.canceledAt
      ? new Date(priority.canceledAt)
      : null;

    this.month =
      priority.month !== undefined && priority.month !== null
        ? Number(priority.month)
        : null;
    this.year =
      priority.year !== undefined && priority.year !== null
        ? Number(priority.year)
        : null;

    this.status = priority.status as PriorityStatus;

    this.positionId = priority.positionId;
    this.objectiveId = priority.objectiveId ?? null;

    this.createdBy = priority.createdBy ?? null;
    this.updatedBy = priority.updatedBy ?? null;
    this.createdAt = new Date(priority.createdAt);
    this.updatedAt = new Date(priority.updatedAt);

    // Campo derivado (lo setea el Service cuando corresponda)
    this.monthlyClass = priority.monthlyClass as MonthlyClass | undefined;
  }
}
