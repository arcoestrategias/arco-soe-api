import {
  IsArray,
  IsDateString,
  IsDecimal,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StrategicPlanDto {
  @IsUUID() id: string;
  @IsString() name: string;
  @IsDateString() periodStart: string;
  @IsDateString() periodEnd: string;
  @IsOptional() @IsString() mission?: string;
  @IsOptional() @IsString() vision?: string;
  @IsOptional() @IsString() competitiveAdvantage?: string;
}

export class IcpDto {
  @IsInt() month: number; // 1..12
  @IsInt() year: number;
  @IsUUID() positionId: string;
  @IsInt() totalPlanned: number;
  @IsInt() totalCompleted: number;
  @Type(() => Number)
  @IsNumber()
  icp: number;
  @IsOptional() @IsInt() notCompletedPreviousMonths?: number;
  @IsOptional() @IsInt() notCompletedOverdue?: number;
  @IsOptional() @IsInt() inProgress?: number;
  @IsOptional() @IsInt() completedPreviousMonths?: number;
  @IsOptional() @IsInt() completedLate?: number;
  @IsOptional() @IsInt() completedInOtherMonth?: number;
  @IsOptional() @IsInt() completedOnTime?: number;
  @IsOptional() @IsInt() canceled?: number;
  @IsOptional() @IsInt() completedEarly?: number;
}

export class MonthlyClassStyleDto {
  @IsString() backgroundColor: string;
  @IsString() color: string;
}

export class PriorityRowDto {
  @IsUUID() id: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string | null;
  @IsInt() order: number;

  @IsDateString() fromAt: string;
  @IsDateString() untilAt: string;
  @IsOptional() @IsDateString() finishedAt?: string | null;
  @IsOptional() @IsDateString() canceledAt?: string | null;

  @IsInt() month: number;
  @IsInt() year: number;

  @IsOptional() @IsString() status?: string; // OPE/CLO/CAN/etc
  @IsOptional() @IsUUID() positionId?: string | null;
  @IsOptional() @IsUUID() objectiveId?: string | null;
  @IsOptional() @IsString() objectiveName?: string | null;

  @IsString() monthlyClass: string;
  @ValidateNested()
  @Type(() => MonthlyClassStyleDto)
  monthlyClassStyle: MonthlyClassStyleDto;

  @IsString() compliance: string; // "100%", etc.
}

export class PrioritiesReportDto {
  @IsUUID() companyId: string;
  @IsUUID() businessUnitId: string;
  @IsUUID() positionId: string;

  @ValidateNested()
  @Type(() => StrategicPlanDto)
  strategicPlan: StrategicPlanDto;

  @ValidateNested()
  @Type(() => IcpDto)
  icp: IcpDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorityRowDto)
  priorities: PriorityRowDto[];
}
