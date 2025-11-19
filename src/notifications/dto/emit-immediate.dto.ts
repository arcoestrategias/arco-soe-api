import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import {
  NotificationChannel,
  NotificationEntity,
  NotificationEvent,
} from '@prisma/client';

export class EmitImmediateDto {
  @IsUUID() companyId!: string;
  @IsUUID() businessUnitId!: string;
  @IsUUID() recipientId!: string;
  @IsEnum(NotificationEntity) entityType!: NotificationEntity;
  @IsUUID() entityId!: string;
  @IsEnum(NotificationEvent) event!:
    | 'ASSIGNED'
    | 'UPDATED'
    | 'REOPENED'
    | 'COMPLETED'
    | 'APPROVAL_REQUESTED'
    | 'APPROVED'
    | 'REJECTED';
  @IsOptional() channels?: NotificationChannel[];
  @IsOptional() @IsObject() variables?: Record<string, any>;
}
