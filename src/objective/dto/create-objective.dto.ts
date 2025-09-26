import { Type } from 'class-transformer';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  MinLength,
  IsNumber,
} from 'class-validator';

export class CreateObjectiveDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['FIN', 'CLI', 'PRO', 'PER'])
  perspective?: 'FIN' | 'CLI' | 'PRO' | 'PER';

  @IsString()
  @IsIn(['EST', 'OPE'])
  @IsOptional()
  level?: 'EST' | 'OPE';

  @IsString()
  @IsIn(['CRE', 'REN'])
  @IsOptional()
  valueOrientation?: 'CRE' | 'REN';

  @IsUUID()
  @IsNotEmpty()
  strategicPlanId: string;

  @IsUUID()
  @IsNotEmpty()
  positionId: string;

  @IsUUID()
  @IsOptional()
  objectiveParentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  goalValue?: number | null;

  @IsString()
  @IsIn(['OPE', 'CLO'])
  @IsOptional()
  status?: string;
}
