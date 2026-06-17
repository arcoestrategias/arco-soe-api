import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString,
  ValidateNested, IsUUID,
} from 'class-validator';
import { ParticipantDto } from './participant.dto';

export class CreateMeetingDto {
  @IsNotEmpty()
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  businessUnitId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  tools?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsIn(['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  frequency?: string;
}
