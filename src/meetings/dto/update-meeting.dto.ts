import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMeetingDto } from './create-meeting.dto';

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @IsOptional()
  @IsBoolean()
  applyToGroup?: boolean;
}
