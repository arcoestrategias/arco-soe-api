import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    businessUnitId: string,
    permissionName: string,
  ): Promise<boolean> {
    // 0. Verificar si es admin de plataforma
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPlatformAdmin: true,
      },
    });

    if (user?.isPlatformAdmin) return true;

    // 1. Verificar si tiene rol Admin en alguna unidad
    const isAdmin = await this.prisma.userBusinessUnit.findFirst({
      where: {
        userId,
        role: { name: 'Admin' },
      },
    });
    if (isAdmin) return true;

    // 2. Verificar si es gerente general de la empresa dueña de esta unidad
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: businessUnitId },
      select: { companyId: true },
    });

    const isManager = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: businessUnit?.companyId,
        isManager: true,
      },
    });
    if (isManager) return true;

    // 3. Validar permiso específico
    const permission = await this.prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) return false;

    const userPermission = await this.prisma.userPermission.findUnique({
      where: {
        userId_businessUnitId_permissionId: {
          userId,
          businessUnitId,
          permissionId: permission.id,
        },
      },
    });

    return userPermission?.isAllowed ?? false;
  }
}
