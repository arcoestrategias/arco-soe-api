import { PriorityEntity } from '../entities/priority.entity';

export class ResponsePriorityDto {
  id!: string;
  isActive!: boolean;
  name!: string;
  description?: string | null;
  order!: number;
  fromAt!: Date;
  untilAt!: Date;
  finishedAt?: Date | null;
  canceledAt?: Date | null;
  month?: number | null;
  year?: number | null;
  status!: 'OPE' | 'CLO' | 'CAN';
  positionId!: string;
  objectiveId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // derivado
  monthlyClass?: string;

  constructor(e: PriorityEntity) {
    Object.assign(this, e);
  }
}
