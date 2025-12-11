import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PermissionConfigDto {
  @IsUUID('4')
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateModulePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionConfigDto)
  permissions: PermissionConfigDto[];
}
