import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto';
import { RoleEntity } from '../entities/role.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRoleDto): Promise<RoleEntity> {
    try {
      const role = await this.prisma.role.create({ data });
      return new RoleEntity(role);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<RoleEntity[]> {
    const roles = await this.prisma.role.findMany();
    return roles.map((r) => new RoleEntity(r));
  }

  async findById(id: string): Promise<RoleEntity | null> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    return role ? new RoleEntity(role) : null;
  }

  async update(id: string, data: UpdateRoleDto): Promise<RoleEntity> {
    try {
      const role = await this.prisma.role.update({ where: { id }, data });
      return new RoleEntity(role);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.role.delete({ where: { id } });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({
          roleId,
          permissionId: pid,
        })),
      });
    }
  }

  async findRolePermissions(roleId: string) {
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
}
