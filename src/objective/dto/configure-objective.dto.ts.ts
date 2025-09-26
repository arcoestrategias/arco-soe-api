import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateObjectiveDto } from './update-objective.dto';
import { UpdateIndicatorDto } from '../../indicator/dto/update-indicator.dto';

export class MonthYearDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  year!: number;
}

export class ConfigureObjectiveDto {
  @IsUUID()
  objectiveId!: string;

  @ValidateNested()
  @Type(() => UpdateObjectiveDto)
  objective!: UpdateObjectiveDto;

  @ValidateNested()
  @Type(() => UpdateIndicatorDto)
  indicator!: UpdateIndicatorDto;

  // Array exacto calculado en el front según frequency + fromAt/untilAt del indicador
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MonthYearDto)
  months!: MonthYearDto[];

  // Opcional: si ya conoces el indicatorId; si no, lo buscamos por objectiveId
  @IsOptional()
  @IsUUID()
  indicatorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rangeExceptional?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rangeInacceptable?: number | null;
}
