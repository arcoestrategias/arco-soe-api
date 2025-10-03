// src/reports/dto/strategic-projects-report.dto.ts
import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Puedes reutilizar el mismo StrategicPlanDto del reporte de prioridades.
 *  Si prefieres mantenerlo desacoplado, lo dejo aquí idéntico. */
export class StrategicPlanDto {
  @IsUUID() id: string;
  @IsString() name: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsOptional() @IsString() mission?: string;
  @IsOptional() @IsString() vision?: string;
  @IsOptional() @IsString() competitiveAdvantage?: string;
}

export class StrategicProjectsReportDto {
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsUUID()
  businessUnitId!: string;

  @IsUUID()
  positionId!: string;

  @IsUUID()
  projectId!: string;

  @ValidateNested()
  @Type(() => StrategicPlanDto)
  strategicPlan!: StrategicPlanDto;
}
