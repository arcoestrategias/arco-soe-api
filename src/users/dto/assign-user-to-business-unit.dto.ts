import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AssignUserToBusinessUnitDto {
  @IsUUID() userId: string;
  @IsUUID() businessUnitId: string;

  // Rol plantilla desde el que se copian permisos al usuario en esa BU
  @IsUUID()
  @IsOptional()
  roleId?: string;

  // (Opcional) posición dentro de la BU; valida que pertenezca a esa BU
  @IsUUID()
  @IsOptional()
  positionId?: string;

  @IsBoolean()
  @IsOptional()
  isResponsible?: boolean = false;

  // true = copia RolePermission → UserPermission
  @IsBoolean()
  @IsOptional()
  copyPermissions?: boolean = true;
}
