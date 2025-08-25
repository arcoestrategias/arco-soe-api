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
    // 1. Obtiene los permisos requeridos desde el decorador @Permissions(...)
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    // Si el endpoint no requiere permisos, permite el acceso.
    if (requiredPermissions.length === 0) return true;

    // 2. Obtiene el usuario autenticado desde el request (inyectado por JwtAuthGuard)
    const req = context.switchToHttp().getRequest<any>();
    const userId: string | undefined = req?.user?.sub;

    if (!userId) {
      // Si no hay usuario en el request, no está autenticado correctamente.
      throw new ForbiddenException('No autenticado');
    }

    // ✅ BYPASS ADMIN: si es admin de plataforma, permite el acceso sin exigir BU.
    const isAdmin = await this.permissionValidator.isPlatformAdmin(userId);
    if (isAdmin) return true;

    // 3. Requiere el header de unidad de negocio para el resto de casos
    const businessUnitId: string | undefined =
      (req.headers['x-business-unit-id'] as string) ??
      (typeof req.get === 'function'
        ? req.get('x-business-unit-id')
        : undefined);

    if (!businessUnitId) {
      throw new ForbiddenException('x-business-unit-id requerido');
    }

    // 4. Verifica uno a uno si el usuario tiene los permisos requeridos en esa unidad.
    for (const permission of requiredPermissions) {
      const hasAccess = await this.permissionValidator.hasPermission(
        userId,
        businessUnitId,
        permission,
      );

      // Si no tiene al menos uno, deniega el acceso (se exige cada permiso declarado).
      if (!hasAccess) {
        throw new ForbiddenException(`No tienes permiso para: ${permission}`);
      }
    }

    // 5. Si se cumplen todos los permisos, permite el acceso
    return true;
  }
}
