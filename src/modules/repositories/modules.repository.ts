import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateModuleDto, UpdateModuleDto } from '../dto';
import { ModuleEntity } from '../entities/module.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateModuleDto): Promise<ModuleEntity> {
    try {
      const module = await this.prisma.module.create({ data });
      return new ModuleEntity(module);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<ModuleEntity[]> {
    const modules = await this.prisma.module.findMany();
    return modules.map((m) => new ModuleEntity(m));
  }

  async findById(id: string): Promise<ModuleEntity | null> {
    const module = await this.prisma.module.findUnique({ where: { id } });
    return module ? new ModuleEntity(module) : null;
  }

  async update(id: string, data: UpdateModuleDto): Promise<ModuleEntity> {
    try {
      const module = await this.prisma.module.update({
        where: { id },
        data,
      });
      return new ModuleEntity(module);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.module.delete({ where: { id } });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
