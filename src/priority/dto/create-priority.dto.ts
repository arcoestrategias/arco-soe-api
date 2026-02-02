import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriorityDto {
  @IsString()
  @Length(3, 500)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

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
  @Type(() => Date)
  @IsDate()
  canceledAt?: Date | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  // status por defecto es OPE; solo permitimos override controlado
  @IsOptional()
  @IsIn(['OPE', 'CLO', 'CAN'])
  status?: 'OPE' | 'CLO' | 'CAN';

  @IsUUID()
  positionId!: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string;
}
