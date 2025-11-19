import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { NotificationEvent, NotificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ListNotificationsDto {
  @IsOptional() @IsEnum(NotificationStatus) status?: NotificationStatus;
  @IsOptional() @IsEnum(NotificationEvent) event?: NotificationEvent;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize: number = 20;
  @IsOptional() @IsString() search?: string;
}
