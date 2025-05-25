import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionsRepository } from './repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepo: PermissionsRepository) {}

  async create(dto: CreatePermissionDto): Promise<PermissionEntity> {
    return this.permissionsRepo.create(dto);
  }

  async findAll(): Promise<PermissionEntity[]> {
    return this.permissionsRepo.findAll();
  }

  async findById(id: string): Promise<PermissionEntity> {
    const permission = await this.permissionsRepo.findById(id);
    if (!permission) throw new NotFoundException('Permiso no encontrado');
    return permission;
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    await this.findById(id); // validación previa
    return this.permissionsRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // validación previa
    return this.permissionsRepo.remove(id);
  }

  async bulkInsert(data: { name: string; moduleId: string }[]): Promise<void> {
    return this.permissionsRepo.bulkInsert(data);
  }
}
