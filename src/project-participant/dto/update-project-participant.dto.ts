import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectParticipantDto } from './create-project-participant.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateProjectParticipantDto extends PartialType(
  CreateProjectParticipantDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
