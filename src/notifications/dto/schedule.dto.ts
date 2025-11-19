import { IsDate, IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { NotificationEntity, NotificationEvent } from '@prisma/client';
import { Type } from 'class-transformer';

export class ScheduleDto {
  @IsUUID() companyId!: string;
  @IsUUID() businessUnitId!: string;
  @IsUUID() recipientId!: string;
  @IsEnum(NotificationEntity) entityType!: NotificationEntity;
  @IsUUID() entityId!: string;
  @IsEnum(NotificationEvent) event!: 'DUE_SOON' | 'OVERDUE';
  @Type(() => Date) @IsDate() runAt!: Date;
  @IsOptional() @IsObject() variables?: Record<string, any>;
}
