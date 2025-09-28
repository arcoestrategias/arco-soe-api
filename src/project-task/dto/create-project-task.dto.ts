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
} from 'class-validator';
import { Type } from 'class-transformer';

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
  budget?: number; // default en service: 0

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

  @IsUUID()
  @IsNotEmpty()
  projectParticipantId: string;
}
