// src/users/repositories/user-assignment.repository.ts
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
   * Asigna un usuario existente a una BU (opcionalmente con rol/posición) y
   * (opcionalmente) copia permisos del rol a UserPermission en esa BU.
   *
   * Fuente de verdad: UserBusinessUnit (UBU).
   */
  async assignExistingUserToBusinessUnit(params: {
    userId: string;
    businessUnitId: string;
    roleId?: string;
    positionId?: string;
    isResponsible?: boolean;
    copyPermissions?: boolean;
    actorId?: string; // opcional, por trazabilidad
  }) {
    const {
      userId,
      businessUnitId,
      roleId,
      positionId,
      isResponsible = false,
      copyPermissions = true,
      actorId,
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
      const existing = await tx.userBusinessUnit.findUnique({
        where: { userId_businessUnitId: { userId, businessUnitId } },
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
        // ¿ya está ocupada? (UBU es la autoridad)
        const taken = await tx.userBusinessUnit.findFirst({
          where: { positionId },
          select: { userId: true },
        });
        if (taken) {
          throw new ConflictException('La posición ya está ocupada');
        }
      }

      // 4) Crear vínculo UserBusinessUnit
      await tx.userBusinessUnit.create({
        data: {
          // estilo RELACIONAL para todas las claves
          user: { connect: { id: userId } },
          businessUnit: { connect: { id: businessUnitId } },

          // opcionales: solo si vienen, se conectan; si no, se omiten
          ...(roleId ? { role: { connect: { id: roleId } } } : {}),
          ...(positionId ? { position: { connect: { id: positionId } } } : {}),

          // bandera
          isResponsible,

          // ⚠️ Solo incluye estos si EXISTEN en tu modelo UBU
          // createdBy: actorId ?? null,
          // updatedBy: actorId ?? null,
        } satisfies Prisma.UserBusinessUnitCreateInput, // ayuda a TS a inferir bien
      });

      // 5) (Opcional) Copiar permisos de Role → UserPermission para esa BU
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
              createdBy: actorId ?? null,
              updatedBy: actorId ?? null,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 6) ¡Listo! No se actualiza Position (ya no tiene userId)
      return { ok: true };
    });
  }

  /**
   * Mueve un usuario de una BU a otra.
   * - Si no existe el vínculo en la BU destino, lo crea (upsert)
   * - Copia permisos del nuevo rol en BU destino (si se envió roleId y no es null)
   * - Borra permisos y vínculo de la BU origen
   */
  async moveUserBetweenBusinessUnitsAtomic(params: {
    userId: string;
    fromBusinessUnitId: string;
    toBusinessUnitId: string;
    roleId?: string; // si no viene, NO-OP de rol/permisos destino
    positionId?: string | null; // undefined: no tocar; null: desconectar (solo en update); string: conectar
    isResponsible?: boolean;
    actorId?: string;
  }): Promise<void> {
    const {
      userId,
      fromBusinessUnitId,
      toBusinessUnitId,
      roleId,
      positionId,
      isResponsible,
    } = params;

    await this.prisma.$transaction(async (tx) => {
      // 0) Validaciones básicas
      const buTo = await tx.businessUnit.findUnique({
        where: { id: toBusinessUnitId },
        select: { id: true },
      });
      if (!buTo)
        throw new NotFoundException('Unidad de negocio destino no encontrada');

      // Validar posición si se envía como string
      if (typeof positionId === 'string') {
        const pos = await tx.position.findUnique({
          where: { id: positionId },
          select: { id: true, businessUnitId: true },
        });
        if (!pos) throw new NotFoundException('Posición no encontrada');
        if (pos.businessUnitId !== toBusinessUnitId) {
          throw new BadRequestException(
            'La posición no pertenece a la unidad de negocio destino',
          );
        }
        // ¿ocupada por otra persona?
        const taken = await tx.userBusinessUnit.findFirst({
          where: { positionId },
          select: { userId: true, businessUnitId: true },
        });
        if (
          taken &&
          !(
            taken.userId === userId && taken.businessUnitId === toBusinessUnitId
          )
        ) {
          throw new ConflictException('La posición ya está ocupada');
        }
      }

      // 1) UPSERT del vínculo en BU destino
      const createData: Prisma.UserBusinessUnitCreateInput = {
        user: { connect: { id: userId } },
        businessUnit: { connect: { id: toBusinessUnitId } },
        ...(typeof isResponsible === 'boolean' ? { isResponsible } : {}),
        // En CREATE: solo connect (nunca disconnect)
        ...(roleId ? { role: { connect: { id: roleId } } } : {}),
        ...(typeof positionId === 'string'
          ? { position: { connect: { id: positionId } } }
          : {}),
      };

      const updateData: Prisma.UserBusinessUnitUpdateInput = {
        ...(typeof isResponsible === 'boolean' ? { isResponsible } : {}),
        // En UPDATE: podemos connect / disconnect
        ...(roleId ? { role: { connect: { id: roleId } } } : {}),
        ...(positionId === undefined
          ? {}
          : positionId === null
            ? { position: { disconnect: true } }
            : { position: { connect: { id: positionId } } }),
      };

      await tx.userBusinessUnit.upsert({
        where: {
          userId_businessUnitId: { userId, businessUnitId: toBusinessUnitId },
        },
        create: createData,
        update: updateData,
      });

      // 2) Reemplazar permisos en BU destino SOLO si se provee roleId
      if (roleId) {
        await tx.userPermission.deleteMany({
          where: { userId, businessUnitId: toBusinessUnitId },
        });

        const rps = await tx.rolePermission.findMany({
          where: { roleId },
          select: { permissionId: true },
        });

        if (rps.length) {
          await tx.userPermission.createMany({
            data: rps.map((rp) => ({
              userId,
              businessUnitId: toBusinessUnitId,
              permissionId: rp.permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3) Limpiar BU origen: borrar permisos y el vínculo
      await tx.userPermission.deleteMany({
        where: { userId, businessUnitId: fromBusinessUnitId },
      });

      await tx.userBusinessUnit.deleteMany({
        where: { userId, businessUnitId: fromBusinessUnitId },
      });
    });
  }

  findByUserAndBusinessUnit(userId: string, businessUnitId: string) {
    return this.prisma.userBusinessUnit.findUnique({
      where: { userId_businessUnitId: { userId, businessUnitId } },
      include: {
        role: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, isCeo: true } },
      },
    });
  }

  findUserPermissions(userId: string, businessUnitId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId, businessUnitId },
      select: { permissionId: true },
    });
  }

  /**
   * Operación ATÓMICA:
   * - Actualiza UBU (role/position/isResponsible) según params
   * - Si roleId viene definido (string) => reemplaza permisos (delete + copy RolePermission)
   * - Si roleId es undefined => NO-OP en rol y permisos
   * - Si roleId es null => NO-OP (ya se filtró en service)
   */
  async updateUserBusinessUnitAtomic(params: {
    userId: string;
    businessUnitId: string;
    roleId?: string; // solo llega si realmente cambia (decisión del service)
    positionId?: string | null; // undefined: no tocar; null: desconectar; string: conectar
    isResponsible?: boolean; // undefined: no tocar
    actorId?: string;
  }) {
    const { userId, businessUnitId, roleId, positionId, isResponsible } =
      params;

    await this.prisma.$transaction(async (tx) => {
      // 1) Construir data de update UBU (solo lo que venga definido)
      const data: Prisma.UserBusinessUnitUpdateInput = {
        ...(typeof isResponsible === 'boolean' ? { isResponsible } : {}),
        ...(roleId !== undefined ? { role: { connect: { id: roleId } } } : {}),
        ...(positionId !== undefined
          ? positionId === null
            ? { position: { disconnect: true } }
            : { position: { connect: { id: positionId } } }
          : {}),
      };

      if (Object.keys(data).length) {
        await tx.userBusinessUnit.update({
          where: { userId_businessUnitId: { userId, businessUnitId } },
          data,
        });
      }

      // 2) Reemplazar permisos SOLO si vino roleId definido (string)
      if (roleId !== undefined) {
        // borrar todos los permisos del user en esa BU
        await tx.userPermission.deleteMany({
          where: { userId, businessUnitId },
        });

        // copiar permisos del role nuevo
        const rolePerms = await tx.rolePermission.findMany({
          where: { roleId },
          select: { permissionId: true },
        });

        if (rolePerms.length) {
          await tx.userPermission.createMany({
            data: rolePerms.map((rp) => ({
              userId,
              businessUnitId,
              permissionId: rp.permissionId,
              // createdBy/updatedBy si existen en tu modelo
            })),
            skipDuplicates: true,
          });
        }
      }
    });
  }

  // updateByUserAndBusinessUnit(
  //   where: { userId: string; businessUnitId: string },
  //   data: Prisma.UserBusinessUnitUpdateInput,
  // ) {
  //   return this.prisma.userBusinessUnit.update({
  //     where: { userId_businessUnitId: where },
  //     data,
  //   });
  // }
}
