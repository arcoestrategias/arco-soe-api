// src/features/project-tasks/dto/create-project-task.dto.ts
import {
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsIn,
  IsNumber,
  Min,
  IsDate,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

class TaskParticipantDto {
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  externalUserId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  name?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 255)
  email?: string;
}

export class CreateProjectTaskDto {
  @IsString()
  @Length(3, 500)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string | null;

  @Type(() => Date)
  @IsDate()
  fromAt!: Date;

  @Type(() => Date)
  @IsDate()
  untilAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  finishedAt?: Date | null;

  @IsOptional()
  @IsIn(['OPE', 'CLO'])
  status?: 'OPE' | 'CLO';

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  props?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  result?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  methodology?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  limitation?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comments?: string | null;

  @IsUUID()
  @IsNotEmpty()
  projectFactorId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskParticipantDto)
  participants?: TaskParticipantDto[];
}
