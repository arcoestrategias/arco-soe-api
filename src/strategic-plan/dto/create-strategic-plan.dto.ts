import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
  IsInt,
  IsDateString,
  IsDate,
  IsBoolean,
} from 'class-validator';

export class CreateStrategicPlanDto {
  @IsString()
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  period?: number;

  @Type(() => Date)
  @IsDate()
  fromAt: Date;

  @Type(() => Date)
  @IsDate()
  untilAt: Date;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  mission?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  vision?: string;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  competitiveAdvantage?: string;

  @IsUUID()
  @IsNotEmpty()
  businessUnitId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
