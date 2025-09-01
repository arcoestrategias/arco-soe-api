import { IsUUID } from 'class-validator';

export class ListStrategicProjectsByPlanAndPositionDto {
  @IsUUID()
  strategicPlanId: string;

  @IsUUID()
  positionId: string;
}
