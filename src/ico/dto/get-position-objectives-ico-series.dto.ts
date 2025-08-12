import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPositionObjectivesIcoSeriesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  fromYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  toYear?: number;

  @IsOptional()
  search?: string; // filtrar por nombre de objetivo

  @IsOptional()
  @IsIn(['all', 'measured'])
  mode?: 'all' | 'measured';
}
