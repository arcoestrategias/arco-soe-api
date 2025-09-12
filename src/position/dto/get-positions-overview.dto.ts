import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class GetPositionsOverviewDto {
  @IsUUID() businessUnitId: string;
  @IsUUID() strategicPlanId: string;

  @IsInt() @Min(1) @Max(12) month: number;
  @IsInt() year: number;

  @IsOptional() @IsString() search?: string; // filtra por nombre de posición/usuario
}
