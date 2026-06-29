import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsNumber, IsString, IsBoolean, IsDateString, MaxLength, IsArray, ValidateNested } from 'class-validator';

export class SaveMeasurementDto {
  @IsInt()
  index: number;

  @IsOptional()
  @IsNumber()
  result?: number | null;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observation?: string | null;

  @IsOptional()
  @IsBoolean()
  isIgnore?: boolean;
}

export class SaveMeasurementsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveMeasurementDto)
  measurements: SaveMeasurementDto[];
}
