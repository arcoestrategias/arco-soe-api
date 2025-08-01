import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    businessUnitId: string,
    permissionName: string,
  ): Promise<boolean> {
    // 1. Verificar si el usuario tiene una regla personalizada (UserPermission)
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userId,
        businessUnitId,
        permission: {
          name: permissionName,
        },
      },
      select: {
        isAllowed: true,
      },
    });

    return userPermission?.isAllowed ?? false;
  }
}
