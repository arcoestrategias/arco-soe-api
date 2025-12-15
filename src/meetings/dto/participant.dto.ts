import { IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { MeetingParticipantRole } from '@prisma/client';

export class ParticipantDto {
  @IsUUID()
  userId: string;

  @IsEnum(MeetingParticipantRole)
  role: MeetingParticipantRole;

  @IsBoolean()
  isRequired: boolean;
}
