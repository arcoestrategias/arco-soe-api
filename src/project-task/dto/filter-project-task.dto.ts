import {
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class FilterProjectTaskDto {
  @IsUUID()
  projectFactorId!: string;

  @IsOptional()
  @IsIn(['OPE', 'CLO'])
  status?: 'OPE' | 'CLO';

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
  limit?: number = 50;
}
