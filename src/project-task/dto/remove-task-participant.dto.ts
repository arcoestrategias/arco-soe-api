import { IsUUID } from 'class-validator';

export class RemoveTaskParticipantDto {
  @IsUUID()
  participantId!: string;
}
