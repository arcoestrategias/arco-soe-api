import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';
import { RolesRepository } from './repositories/roles.repository';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepo: RolesRepository) {}

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    return this.rolesRepo.create(dto);
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.rolesRepo.findAll();
  }

  async findById(id: string): Promise<RoleEntity> {
    const role = await this.rolesRepo.findById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    await this.findById(id);
    return this.rolesRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.rolesRepo.remove(id);
  }

  async assignPermissions(dto: AssignPermissionsDto): Promise<void> {
    await this.findById(dto.roleId);
    return this.rolesRepo.assignPermissions(dto.roleId, dto.permissionIds);
  }

  async findWithPermissions(id: string): Promise<{
    role: RoleEntity;
    permissions: { id: string; name: string }[];
  }> {
    const result = await this.rolesRepo.findWithPermissions(id);
    if (!result) throw new NotFoundException('Rol no encontrado');
    return result;
  }
}
