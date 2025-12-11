import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto';
import { PermissionEntity } from '../entities/permission.entity';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePermissionDto,
    userId: string,
  ): Promise<PermissionEntity> {
    return this.prisma.permission.create({
      data: {
        ...data,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    return this.prisma.permission.findUnique({
      where: { id, isActive: true },
    });
  }

  /**
   * Finds a permission by its ID, regardless of its active status.
   * @param id The ID of the permission.
   * @returns A permission entity or null.
   */
  async findAnyById(id: string): Promise<PermissionEntity | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: UpdatePermissionDto,
    userId: string,
  ): Promise<PermissionEntity> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, userId: string): Promise<PermissionEntity> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: userId,
      },
    });
  }

  /**
   * Busca todos los permisos activos asociados a un ID de módulo.
   * @param moduleId El ID del módulo.
   * @returns Una lista de entidades de permiso.
   */
  async findByModuleId(moduleId: string): Promise<PermissionEntity[]> {
    return this.prisma.permission.findMany({
      where: {
        moduleId: moduleId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Busca todos los permisos (activos e inactivos) asociados a un ID de módulo.
   * @param moduleId El ID del módulo.
   * @returns Una lista de entidades de permiso.
   */
  async findAllByModuleId(moduleId: string): Promise<PermissionEntity[]> {
    return this.prisma.permission.findMany({
      where: {
        moduleId: moduleId,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Los métodos de abajo parecen estar relacionados con la asignación a usuarios,
  // los mantendremos como están ya que no interfieren con el CRUD de la entidad Permission.
  async assignUserPermission(data: {
    userId: string;
    permissionId: string;
    businessUnitId: string;
  }) {
    return this.prisma.userPermission.create({
      data: {
        ...data,
      },
    });
  }

  async updateUserPermissionsBulk(
    userId: string,
    businessUnitId: string,
    permissions: { id: string; isAllowed: boolean }[],
    actorId: string,
  ): Promise<void> {
    // 1. Identificar los IDs que el frontend quiere activos
    const activePermissionIds = new Set(
      permissions.filter((p) => p.isAllowed).map((p) => p.id),
    );

    // 2. Obtener todos los permisos que ya existen en la BD para este usuario/BU
    const existingUserPermissions = await this.prisma.userPermission.findMany({
      where: { userId, businessUnitId },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(
      existingUserPermissions.map((up) => up.permissionId),
    );

    // 3. Calcular deltas
    const idsToCreate = Array.from(activePermissionIds).filter(
      (id) => !existingPermissionIds.has(id),
    );
    const idsToReactivate = Array.from(activePermissionIds).filter((id) =>
      existingPermissionIds.has(id),
    );
    const idsToDeactivate = Array.from(existingPermissionIds).filter(
      (id) => !activePermissionIds.has(id),
    );

    // 4. Ejecutar operaciones en transacción
    const operations: any[] = [];

    if (idsToCreate.length > 0) {
      operations.push(
        this.prisma.userPermission.createMany({
          data: idsToCreate.map((permissionId) => ({
            userId,
            businessUnitId,
            permissionId,
            isAllowed: true,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        }),
      );
    }

    if (idsToReactivate.length > 0) {
      operations.push(
        this.prisma.userPermission.updateMany({
          where: {
            userId,
            businessUnitId,
            permissionId: { in: idsToReactivate },
          },
          data: { isAllowed: true, updatedBy: actorId },
        }),
      );
    }

    if (idsToDeactivate.length > 0) {
      operations.push(
        this.prisma.userPermission.updateMany({
          where: {
            userId,
            businessUnitId,
            permissionId: { in: idsToDeactivate },
          },
          data: { isAllowed: false, updatedBy: actorId },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  async configureModulePermissions(
    moduleId: string,
    permissions: { name: string; description?: string; isActive?: boolean }[],
    userId: string,
  ): Promise<void> {
    const permissionNames = permissions.map((p) => p.name);

    await this.prisma.$transaction(async (tx) => {
      // 1. Usamos `upsert` para crear o actualizar cada permiso enviado.
      for (const perm of permissions) {
        await tx.permission.upsert({
          where: { name: perm.name },
          update: {
            description: perm.description,
            isActive: perm.isActive ?? true,
            updatedBy: userId,
          },
          create: {
            name: perm.name,
            description: perm.description,
            moduleId: moduleId,
            isActive: perm.isActive ?? true,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      // 2. Desactivamos los permisos que existen en la BD para este módulo
      // pero que no vinieron en la lista del frontend.
      await tx.permission.updateMany({
        where: {
          moduleId: moduleId,
          name: { notIn: permissionNames },
        },
        data: { isActive: false, updatedBy: userId },
      });
    });
  }
}
