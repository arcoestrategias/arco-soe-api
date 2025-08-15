import { IsUUID, IsOptional } from 'class-validator';

export class ListProjectStructureDto {
  @IsUUID()
  strategicPlanId!: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;
}
