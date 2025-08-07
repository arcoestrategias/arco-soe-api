import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
  IsInt,
  IsDateString,
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
  @IsNotEmpty()
  period: number;

  @IsDateString()
  @IsOptional()
  fromAt?: Date;

  @IsDateString()
  @IsOptional()
  untilAt?: Date;

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
}
