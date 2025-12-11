import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionsRepository } from './repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepo: PermissionsRepository) {}

  async create(
    dto: CreatePermissionDto,
    userId: string,
  ): Promise<PermissionEntity> {
    return this.permissionsRepo.create(dto, userId);
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.permissionsRepo.findAll();
  }

  async findById(id: string): Promise<PermissionEntity> {
    const permission = await this.permissionsRepo.findById(id);
    if (!permission) throw new NotFoundException('Permiso no encontrado');
    return permission;
  }

  private async findAnyById(id: string): Promise<PermissionEntity> {
    const permission = await this.permissionsRepo.findAnyById(id);
    if (!permission) throw new NotFoundException('Permiso no encontrado');
    return permission;
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
    userId: string,
  ): Promise<PermissionEntity> {
    await this.findAnyById(id); // validación previa (ignora isActive)
    return this.permissionsRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findAnyById(id); // validación previa (ignora isActive)
    await this.permissionsRepo.remove(id, userId);
  }

  /**
   * Busca todos los permisos activos asociados a un ID de módulo.
   */
  async findByModuleId(moduleId: string): Promise<PermissionEntity[]> {
    return this.permissionsRepo.findByModuleId(moduleId);
  }

  /**
   * Busca todos los permisos (activos e inactivos) asociados a un ID de módulo.
   */
  async findAllByModuleId(moduleId: string): Promise<PermissionEntity[]> {
    return this.permissionsRepo.findAllByModuleId(moduleId);
  }
}
