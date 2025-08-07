import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateObjectiveGoalDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  year: number;

  @IsNumber()
  @IsOptional()
  goalPercentage?: number;

  @IsNumber()
  @IsOptional()
  goalValue?: number;

  @IsNumber()
  @IsOptional()
  realPercentage?: number;

  @IsNumber()
  @IsOptional()
  realValue?: number;

  @IsNumber()
  @IsOptional()
  indexCompliance?: number;

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsNumber()
  @IsOptional()
  rangeExceptional?: number;

  @IsNumber()
  @IsOptional()
  rangeInacceptable?: number;

  @IsNumber()
  @IsOptional()
  indexPerformance?: number;

  @IsNumber()
  @IsOptional()
  baseValue?: number;

  @IsNumber()
  @IsOptional()
  light?: number;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsUUID()
  objectiveId: string;
}
