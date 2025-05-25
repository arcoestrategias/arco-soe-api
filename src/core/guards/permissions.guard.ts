import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionValidatorService } from '../services/permission-validator.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionValidator: PermissionValidatorService,
  ) {}

  /**
   * Método principal del guard que decide si se permite o no el acceso.
   * Se ejecuta automáticamente en las rutas que usan este guard.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extrae los permisos requeridos definidos por el decorador @Permissions
    const requiredPermissions = this.reflector.getAllAndMerge<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay permisos requeridos definidos, permite el acceso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Obtiene el usuario autenticado desde la request
    const { user } = context.switchToHttp().getRequest();

    // Si no hay usuario o le faltan datos clave, lanza excepción
    if (!user || !user.id || !user.roleId) {
      throw new ForbiddenException(
        'Usuario sin contexto de autenticación válido',
      );
    }

    // 3. Verifica que el usuario tenga cada uno de los permisos requeridos
    for (const permission of requiredPermissions) {
      const hasAccess = await this.permissionValidator.hasPermission(
        user.id,
        user.roleId,
        permission,
      );

      // Si falta alguno, lanza excepción
      if (!hasAccess) {
        throw new ForbiddenException(`No tienes permiso para: ${permission}`);
      }
    }

    // 4. Si se cumplen todos los permisos, permite el acceso
    return true;
  }
}
