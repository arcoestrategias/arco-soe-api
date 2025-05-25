import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateModuleDto, UpdateModuleDto } from './dto';
import { ModulesRepository } from './repositories/modules.repository';
import { ModuleEntity } from './entities/module.entity';

@Injectable()
export class ModulesService {
  constructor(private readonly modulesRepo: ModulesRepository) {}

  async create(dto: CreateModuleDto): Promise<ModuleEntity> {
    return this.modulesRepo.create(dto);
  }

  async findAll(): Promise<ModuleEntity[]> {
    return this.modulesRepo.findAll();
  }

  async findById(id: string): Promise<ModuleEntity> {
    const module = await this.modulesRepo.findById(id);
    if (!module) throw new NotFoundException('Módulo no encontrado');
    return module;
  }

  async update(id: string, dto: UpdateModuleDto): Promise<ModuleEntity> {
    await this.findById(id);
    return this.modulesRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.modulesRepo.remove(id);
  }
}
