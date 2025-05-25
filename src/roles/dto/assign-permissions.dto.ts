import { IsArray, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  @IsUUID()
  roleId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
