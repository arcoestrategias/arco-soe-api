import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateModuleDto, UpdateModuleDto } from '../dto';
import { ModuleEntity } from '../entities/module.entity';

@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateModuleDto, userId: string): Promise<ModuleEntity> {
    return this.prisma.module.create({
      data: {
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async findAll(): Promise<ModuleEntity[]> {
    return this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<ModuleEntity | null> {
    return this.prisma.module.findUnique({
      where: { id, isActive: true },
    });
  }

  async findByName(name: string): Promise<ModuleEntity | null> {
    return this.prisma.module.findFirst({
      where: { name, isActive: true },
    });
  }

  async findByShortCode(shortCode: string): Promise<ModuleEntity | null> {
    return this.prisma.module.findFirst({
      where: { shortCode, isActive: true },
    });
  }

  async update(
    id: string,
    dto: UpdateModuleDto,
    userId: string,
  ): Promise<ModuleEntity> {
    return this.prisma.module.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, userId: string): Promise<ModuleEntity> {
    return this.prisma.module.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: userId,
      },
    });
  }
}
