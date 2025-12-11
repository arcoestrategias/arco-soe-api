import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoleDto): Promise<RoleEntity> {
    // Asumiendo que tienes auditoría en tu modelo Role
    // Si no, puedes quitar createdBy y updatedBy
    return this.prisma.role.create({
      data: {
        ...data,
        // createdBy: userId,
        // updatedBy: userId,
      },
    });
  }

  async findAll(params?: { where?: any }): Promise<RoleEntity[]> {
    return this.prisma.role.findMany({
      ...params,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.prisma.role.findUnique({
      where: { id, isActive: true },
    });
  }

  /**
   * Finds a role by its ID, regardless of its active status.
   * @param id The ID of the role.
   * @returns A role entity or null.
   */
  async findAnyById(id: string): Promise<RoleEntity | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UpdateRoleDto): Promise<RoleEntity> {
    return this.prisma.role.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.role.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async setPermissions(
    roleId: string,
    permissions: { id: string; isActive: boolean }[],
    userId: string,
  ) {
    // 1. Identificar los IDs que el frontend quiere activos
    const activePermissionIds = new Set(
      permissions.filter((p) => p.isActive).map((p) => p.id),
    );

    // 2. Obtener los permisos que ya existen en la BD para este rol (activos e inactivos)
    const existingRolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(
      existingRolePermissions.map((rp) => rp.permissionId),
    );

    // 3. Calcular deltas
    const idsToCreate = Array.from(activePermissionIds).filter(
      (id) => !existingPermissionIds.has(id),
    );

    const idsToActivate = Array.from(activePermissionIds).filter((id) =>
      existingPermissionIds.has(id),
    );

    const idsToDeactivate = Array.from(existingPermissionIds).filter(
      (id) => !activePermissionIds.has(id),
    );

    // 4. Ejecutar operaciones en transacción
    const operations: any[] = [];

    // A) Crear los nuevos
    if (idsToCreate.length > 0) {
      operations.push(
        this.prisma.rolePermission.createMany({
          data: idsToCreate.map((permissionId) => ({
            roleId,
            permissionId,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
          })),
        }),
      );
    }

    // B) Reactivar los que ya existían (asegurar isActive: true)
    if (idsToActivate.length > 0) {
      operations.push(
        this.prisma.rolePermission.updateMany({
          where: { roleId, permissionId: { in: idsToActivate } },
          data: { isActive: true, updatedBy: userId },
        }),
      );
    }

    // C) Inactivar (Soft Delete) los que ya no deben estar
    if (idsToDeactivate.length > 0) {
      operations.push(
        this.prisma.rolePermission.updateMany({
          where: { roleId, permissionId: { in: idsToDeactivate } },
          data: { isActive: false, updatedBy: userId },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  async findPermissions(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async findAllPermissionsWithRoleStatus(roleId: string) {
    // 1. Obtener todos los permisos activos del sistema (Catálogo)
    const allPermissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      include: {
        module: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 2. Obtener los permisos que YA tiene asignados el rol
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId, isActive: true },
      select: { permissionId: true },
    });

    const rolePermissionIds = new Set(
      rolePermissions.map((rp) => rp.permissionId),
    );

    // 3. Mapear y marcar isActive
    return allPermissions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      module: p.module.name,
      isActive: rolePermissionIds.has(p.id),
    }));
  }
}
