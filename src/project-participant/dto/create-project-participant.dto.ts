import { IsUUID, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateProjectParticipantDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  positionId: string;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean = false;
}
