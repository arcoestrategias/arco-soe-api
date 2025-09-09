import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  businessUnitId: string;

  @IsBoolean()
  @IsOptional()
  isCeo?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  mission?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  vision?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  department?: string;

  @IsUUID()
  @IsOptional()
  strategicPlanId?: string;

  @IsUUID()
  @IsOptional()
  positionSuperiorId?: string;
}
