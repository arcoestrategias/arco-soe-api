import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asigna un usuario existente a una BU:
   * - Verifica existencia de user y businessUnit
   * - (Opcional) Verifica que position pertenezca a la BU y esté libre
   * - Crea el vínculo en UserBusinessUnit
   * - (Opcional) Copia permisos del roleId a UserPermission en esa BU (skipDuplicates)
   * - (Opcional) Asigna la Position al usuario (position.userId = userId)
   */
  async assignExistingUserToBusinessUnit(params: {
    userId: string;
    businessUnitId: string;
    roleId?: string;
    positionId?: string;
    isResponsible?: boolean;
    copyPermissions?: boolean;
  }) {
    const {
      userId,
      businessUnitId,
      roleId,
      positionId,
      isResponsible = false,
      copyPermissions = true,
    } = params;

    return this.prisma.$transaction(async (tx) => {
      // 1) Validaciones básicas
      const [user, bu] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.businessUnit.findUnique({ where: { id: businessUnitId } }),
      ]);
      if (!user) throw new NotFoundException('Usuario no encontrado');
      if (!bu) throw new NotFoundException('Unidad de negocio no encontrada');

      // 2) ¿Ya está asignado a esa BU?
      const existing = await tx.userBusinessUnit.findFirst({
        where: { userId, businessUnitId },
      });
      if (existing) {
        throw new ConflictException(
          'El usuario ya está asignado a esta unidad de negocio',
        );
      }

      // 3) Validar posición (si se envía) y que pertenezca a la BU
      if (positionId) {
        const pos = await tx.position.findUnique({ where: { id: positionId } });
        if (!pos) throw new NotFoundException('Posición no encontrada');
        if (pos.businessUnitId !== businessUnitId) {
          throw new BadRequestException(
            'La posición no pertenece a la unidad de negocio objetivo',
          );
        }
        if (pos.userId && pos.userId !== userId) {
          throw new ConflictException(
            'La posición ya está ocupada por otro usuario',
          );
        }
      }

      // 4) Crear vínculo UserBusinessUnit
      const link = await tx.userBusinessUnit.create({
        data: {
          userId,
          businessUnitId,
          roleId: roleId ?? null,
          positionId: positionId ?? null,
          isResponsible,
        },
      });

      // 5) (Opcional) Copiar permisos de Role → UserPermission para esa BU
      let copiedPermissions = 0;
      if (copyPermissions && roleId) {
        const rolePerms = await tx.rolePermission.findMany({
          where: { roleId },
          select: { permissionId: true },
        });

        if (rolePerms.length > 0) {
          await tx.userPermission.createMany({
            data: rolePerms.map((rp) => ({
              userId,
              businessUnitId,
              permissionId: rp.permissionId,
            })),
            skipDuplicates: true,
          });
          copiedPermissions = rolePerms.length;
        }
      }

      // 6) (Opcional) Marcar posición ocupada por el usuario
      if (positionId) {
        await tx.position.update({
          where: { id: positionId },
          data: { userId },
        });
      }

      return {
        userBusinessUnitId: link.id,
        copiedPermissions,
      };
    });
  }

  findByUserAndBusinessUnit(userId: string, businessUnitId: string) {
    return this.prisma.userBusinessUnit.findUnique({
      where: { userId_businessUnitId: { userId, businessUnitId } },
    });
  }

  updateByUserAndBusinessUnit(
    where: { userId: string; businessUnitId: string },
    data: Prisma.UserBusinessUnitUpdateInput,
  ) {
    return this.prisma.userBusinessUnit.update({
      where: { userId_businessUnitId: where },
      data,
    });
  }
}
