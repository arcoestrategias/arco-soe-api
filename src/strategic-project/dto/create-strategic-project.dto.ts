import {
  IsString,
  IsOptional,
  Length,
  IsDate,
  IsInt,
  Min,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStrategicProjectDto {
  @IsString()
  @Length(1, 500)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  untilAt!: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number; // default en service: 0

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number = 0;

  @IsUUID()
  strategicPlanId!: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string | null;

  @IsUUID()
  @IsNotEmpty()
  positionId: string;

  @IsOptional()
  @IsString()
  @IsIn(['IPR', 'CLO', 'OPE'])
  status?: string;
}
