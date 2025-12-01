import { IsString, IsUUID, IsOptional } from 'class-validator';

export class GetStrategicBoardDto {
  @IsUUID()
  strategicPlanId: string;

  @IsOptional()
  @IsString()
  search?: string;
}
