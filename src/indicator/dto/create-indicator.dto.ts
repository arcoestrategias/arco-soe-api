import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  MaxLength,
  IsDate,
} from 'class-validator';

export class CreateIndicatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  formula?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isConfigured?: boolean;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  tendence?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsString()
  @IsOptional()
  measurement?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsDate()
  @IsOptional()
  fromAt?: Date;

  @IsDate()
  @IsOptional()
  untilAt?: Date;
}
