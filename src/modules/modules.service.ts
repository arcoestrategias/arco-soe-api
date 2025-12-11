import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateModuleDto,
  UpdateModuleDto,
  UpdateModulePermissionsDto,
} from './dto';
import { ModulesRepository } from './repositories/modules.repository';
import { ModuleEntity } from './entities/module.entity';
import { PermissionsService } from 'src/permissions/permissions.service';
import { ResponsePermissionDto } from 'src/permissions/dto';
import { PermissionsRepository } from 'src/permissions/repositories/permissions.repository';

@Injectable()
export class ModulesService {
  constructor(
    private readonly modulesRepo: ModulesRepository,
    private readonly permissionsService: PermissionsService,
    private readonly permissionsRepo: PermissionsRepository,
  ) {}

  async create(dto: CreateModuleDto, userId: string): Promise<ModuleEntity> {
    const [existingByName, existingByCode] = await Promise.all([
      this.modulesRepo.findByName(dto.name),
      this.modulesRepo.findByShortCode(dto.shortCode),
    ]);

    if (existingByName) {
      throw new ConflictException(
        `Ya existe un módulo con el nombre "${dto.name}"`,
      );
    }
    if (existingByCode) {
      throw new ConflictException(
        `Ya existe un módulo con el código corto "${dto.shortCode}"`,
      );
    }
    return this.modulesRepo.create(dto, userId);
  }

  async findAll(): Promise<ModuleEntity[]> {
    return this.modulesRepo.findAll();
  }

  async findById(id: string): Promise<ModuleEntity> {
    const module = await this.modulesRepo.findById(id);
    if (!module) throw new NotFoundException('Módulo no encontrado');
    return module;
  }

  async update(
    id: string,
    dto: UpdateModuleDto,
    userId: string,
  ): Promise<ModuleEntity> {
    await this.findById(id); // Asegura que el módulo exista

    if (dto.name) {
      const existing = await this.modulesRepo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Ya existe un módulo con el nombre "${dto.name}"`,
        );
      }
    }
    if (dto.shortCode) {
      const existing = await this.modulesRepo.findByShortCode(dto.shortCode);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Ya existe un módulo con el código corto "${dto.shortCode}"`,
        );
      }
    }

    return this.modulesRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id);
    await this.modulesRepo.remove(id, userId);
  }

  async getModulePermissions(
    moduleId: string,
  ): Promise<ResponsePermissionDto[]> {
    await this.findById(moduleId); // Asegura que el módulo exista
    // Devolvemos TODOS los permisos (activos e inactivos)
    const allPermissions =
      await this.permissionsService.findAllByModuleId(moduleId);
    return allPermissions.map((p) => new ResponsePermissionDto(p));
  }

  async configureModulePermissions(
    moduleId: string,
    dto: UpdateModulePermissionsDto,
    userId: string,
  ): Promise<void> {
    await this.findById(moduleId);

    // Delegamos la lógica de base de datos al repositorio
    await this.permissionsRepo.configureModulePermissions(
      moduleId,
      dto.permissions,
      userId,
    );
  }
}
