import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

class RolePermissionItemDto {
  @IsUUID()
  id: string;

  @IsBoolean()
  isActive: boolean;
}

export class AssignPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions: RolePermissionItemDto[];
}
