import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetObjectivesDto {
  @IsUUID()
  strategicPlanId!: string;

  @IsUUID()
  positionId!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;
}
