import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';
import { RolesRepository } from './repositories/roles.repository';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(dto: CreateRoleDto, userId: string): Promise<RoleEntity> {
    const role = await this.rolesRepository.create(dto);
    if (dto.permissionIds?.length) {
      await this.rolesRepository.setPermissions(
        role.id,
        dto.permissionIds.map((id) => ({ id, isActive: true })),
        userId,
      );
    }

    return role;
  }

  async findAll(includeInactive = false): Promise<RoleEntity[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.rolesRepository.findAll({
      where,
    });
  }

  async findById(id: string): Promise<RoleEntity> {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  private async findAnyById(id: string): Promise<RoleEntity> {
    const role = await this.rolesRepository.findAnyById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    await this.findAnyById(id); // Usamos el nuevo método que ignora 'isActive'
    return this.rolesRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findAnyById(id); // Usamos el nuevo método que ignora 'isActive'
    return this.rolesRepository.remove(id);
  }

  async setRolePermissions(
    roleId: string,
    permissions: { id: string; isActive: boolean }[],
    userId: string,
  ) {
    await this.rolesRepository.setPermissions(roleId, permissions, userId);
  }

  async getPermissionsOfRole(roleId: string) {
    await this.findById(roleId); // Asegura que el rol exista
    return this.rolesRepository.findAllPermissionsWithRoleStatus(roleId);
  }
}
