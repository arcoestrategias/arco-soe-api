import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
export class StrategicPlanDto {
  @IsUUID() id: string;

  @IsString() name: string;

  @IsDateString() periodStart: string; // YYYY-MM-DD

  @IsDateString() periodEnd: string; // YYYY-MM-DD

  @IsString() mission: string;

  @IsString() vision: string;

  @IsString() competitiveAdvantage: string;
}

export class ItemDto {
  @IsString() id: string;

  @IsString() name: string;

  @IsInt() order: number;

  @IsBoolean() isActive: boolean;
}

export class DefinitionsReportDto {
  @IsUUID() companyId: string;

  @IsUUID() businessUnitId: string;

  @ValidateNested()
  @Type(() => StrategicPlanDto)
  strategicPlan: StrategicPlanDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  successFactors: ItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  strategicValues: ItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  objectives: ItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  strategicProjects: ItemDto[];
}
