import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  MinLength,
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
  @IsIn(['FIN', 'CLI', 'PRO', 'PER'])
  perspective: 'FIN' | 'CLI' | 'PRO' | 'PER';

  @IsString()
  @IsIn(['REN', 'OPE'])
  @IsOptional()
  level?: 'REN' | 'OPE';

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
  parentId?: string;
}
