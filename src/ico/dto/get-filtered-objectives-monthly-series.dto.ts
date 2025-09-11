import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetFilteredObjectivesMonthlySeriesDto {
  @IsUUID()
  strategicPlanId!: string;

  @IsUUID()
  positionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  fromYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  toYear!: number;

  @IsOptional()
  @IsString()
  search?: string;
}
