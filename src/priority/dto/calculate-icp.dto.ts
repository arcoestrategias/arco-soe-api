import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CalculatePriorityIcpDto {
  @IsInt()
  @Min(1)
  month!: number; // 1..12

  @IsInt()
  @Min(1900)
  year!: number;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string;
}

export class ResponsePriorityIcpDto {
  month!: number;
  year!: number;
  positionId?: string;
  objectiveId?: string;

  totalPlanned!: number; // sin canceladas
  totalCompleted!: number; // onTime + late
  icp!: number; // %

  // métricas planas
  notCompletedPreviousMonths!: number;
  notCompletedOverdue!: number;
  inProgress!: number;
  completedPreviousMonths!: number;
  completedLate!: number;
  completedInOtherMonth!: number;
  completedOnTime!: number;
  canceled!: number;
  completedEarly!: number;
}
