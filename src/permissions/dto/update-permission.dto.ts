import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePermissionDto } from './create-permission.dto';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
