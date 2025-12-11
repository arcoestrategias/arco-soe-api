import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

class UserPermissionItemDto {
  @IsUUID()
  id: string;

  @IsBoolean()
  isAllowed: boolean;
}

export class UpdateUserPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionItemDto)
  permissions: UserPermissionItemDto[];
}
