import {
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterStrategicProjectDto {
  @IsOptional()
  @IsUUID()
  strategicPlanId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  until?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['order', 'fromAt', 'untilAt', 'createdAt'])
  orderBy?: 'order' | 'fromAt' | 'untilAt' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'desc';
}
