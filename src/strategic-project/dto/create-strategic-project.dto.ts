import {
  IsString,
  IsOptional,
  Length,
  IsDate,
  IsInt,
  Min,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStrategicProjectDto {
  @IsString()
  @Length(3, 150)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
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
}
