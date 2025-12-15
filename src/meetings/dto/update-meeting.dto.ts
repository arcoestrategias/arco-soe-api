import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateMeetingDto } from './create-meeting.dto';

export enum UpdateScope {
  ONLY_THIS = 'ONLY_THIS',
  THIS_AND_FUTURE = 'THIS_AND_FUTURE',
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @IsEnum(UpdateScope)
  scope: UpdateScope;

  @IsString()
  @IsOptional()
  occurrenceDate?: string;
}
