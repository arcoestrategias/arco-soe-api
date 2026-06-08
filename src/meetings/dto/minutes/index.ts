import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateMinutesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @IsOptional()
  @IsUUID()
  occurrenceId?: string;
}

export class UpdateMinutesDto {
  @IsOptional()
  agenda?: string[];

  @IsOptional()
  positions?: any;

  @IsOptional()
  attendance?: any;

  @IsOptional()
  @IsString()
  @Length(0, 3000)
  observations?: string;
}

export class CreatePriorityFromMinutesDto {
  @IsUUID()
  positionId!: string;

  @IsString()
  @Length(3, 500)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  fromAt?: string;

  @IsOptional()
  @IsDateString()
  untilAt?: string;

  @IsOptional()
  @IsIn(['OPE', 'CLO', 'CAN'])
  status?: 'OPE' | 'CLO' | 'CAN';

  @IsOptional()
  @IsUUID()
  objectiveId?: string;
}
