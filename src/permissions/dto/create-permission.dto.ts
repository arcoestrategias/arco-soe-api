import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsUUID()
  moduleId: string;

  @IsBoolean()
  isActive: boolean;
}
