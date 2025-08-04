import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';
import { RolesRepository } from './repositories/roles.repository';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const role = await this.rolesRepository.create(dto);
    if (dto.permissionIds?.length) {
      await this.rolesRepository.setPermissions(role.id, dto.permissionIds);
    }

    return role;
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.rolesRepository.findAll();
  }

  async findById(id: string): Promise<RoleEntity> {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    await this.findById(id);
    return this.rolesRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.rolesRepository.remove(id);
  }

  async setRolePermissions(roleId: string, permissionIds: string[]) {
    await this.rolesRepository.setPermissions(roleId, permissionIds);
  }

  async getPermissionsOfRole(roleId: string) {
    const rolePermissions = await this.rolesRepository.findPermissions(roleId);

    const result: Record<string, Record<string, boolean>> = {};

    for (const rp of rolePermissions) {
      const permission = rp.permission;
      const action = permission.name.split('.')[1];
      const shortCode = permission.module.shortCode;

      if (
        ![
          'access',
          'create',
          'read',
          'update',
          'delete',
          'export',
          'approve',
          'assign',
        ].includes(action)
      )
        continue;

      if (!result[shortCode]) {
        result[shortCode] = {
          access: false,
          create: false,
          read: false,
          update: false,
          delete: false,
          export: false,
          approve: false,
          assign: false,
        };
      }

      result[shortCode][action] = true;
    }

    return { modules: result };
  }
}
