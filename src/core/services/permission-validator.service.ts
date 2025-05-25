import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    roleId: string,
    permissionName: string,
  ): Promise<boolean> {
    // 1. Verificar si el usuario tiene una regla personalizada (UserPermission)
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permissionName,
        },
      },
      select: {
        isAllowed: true,
      },
    });

    if (userPermission) {
      return userPermission.isAllowed;
    }

    // 2. Si no hay regla personalizada, verificar si el rol tiene el permiso asignado
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permission: {
          name: permissionName,
        },
      },
      select: {
        permissionId: true,
      },
    });

    return !!rolePermission;
  }
}
