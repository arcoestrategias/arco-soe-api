import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Length,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'El IDE es obligatorio.' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 13, {
    message: 'La identificación debe tener entre 10 y 13 caracteres.',
  })
  ide: string;

  @IsString()
  @IsNotEmpty({ message: 'El representante legal es obligatorio.' })
  legalRepresentativeName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
