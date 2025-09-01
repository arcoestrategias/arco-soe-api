import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString()
  @MaxLength(150)
  @IsNotEmpty({ message: 'El IDE es obligatorio.' })
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
  @IsNotEmpty({ message: 'La compañia es obligatoria.' })
  companyId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
