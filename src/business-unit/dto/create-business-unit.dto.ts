import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsString()
  @MaxLength(13)
  ide: string;

  @IsString()
  @MaxLength(250)
  legalRepresentativeName: string;

  @IsString()
  @MaxLength(250)
  address: string;

  @IsString()
  @MaxLength(50)
  phone: string;

  @IsNumber()
  order: number;

  @IsBoolean()
  isPrivate: boolean;

  @IsBoolean()
  isGroup: boolean;

  @IsBoolean()
  isActive: boolean;

  @IsUUID()
  companyId: string;
}
