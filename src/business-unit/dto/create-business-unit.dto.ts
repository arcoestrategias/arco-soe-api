import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString()
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(13)
  @IsOptional()
  ide?: string;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  legalRepresentativeName?: string;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsUUID()
  @IsNotEmpty()
  companyId: string;
}
