import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionValidatorService } from '../services/permission-validator.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

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

    // Si no se requiere ningún permiso, se permite el acceso.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Obtiene el usuario autenticado desde la request
    const request = context.switchToHttp().getRequest();

    /**
     * userId proviene del token JWT y se inyecta en req.user.sub por JwtStrategy.
     * businessUnitId debe ser enviado por el frontend en el header 'x-business-unit-id'.
     */
    const userId = request.user?.sub;
    const businessUnitId = request.headers['x-business-unit-id'];
    // console.log(userId);
    // console.log(businessUnitId);

    // Verifica que ambos valores estén presentes.
    if (!userId || !businessUnitId) {
      throw new ForbiddenException(
        'Faltan datos de autenticación o unidad de negocio',
      );
    }

    // 3. Verifica uno a uno si el usuario tiene los permisos requeridos en esa unidad.
    for (const permission of requiredPermissions) {
      const hasAccess = await this.permissionValidator.hasPermission(
        userId,
        businessUnitId,
        permission,
      );

      // Si no tiene al menos uno, deniega el acceso.
      if (!hasAccess) {
        throw new ForbiddenException(`No tienes permiso para: ${permission}`);
      }
    }

    // 4. Si se cumplen todos los permisos, permite el acceso
    return true;
  }
}
