import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto';
import { PermissionEntity } from '../entities/permission.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePermissionDto): Promise<PermissionEntity> {
    try {
      const permission = await this.prisma.permission.create({ data });
      return new PermissionEntity(permission);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<PermissionEntity[]> {
    const permissions = await this.prisma.permission.findMany();
    return permissions.map((p) => new PermissionEntity(p));
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    return permission ? new PermissionEntity(permission) : null;
  }

  async update(
    id: string,
    data: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    try {
      const permission = await this.prisma.permission.update({
        where: { id },
        data,
      });
      return new PermissionEntity(permission);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.permission.delete({ where: { id } });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async bulkInsert(data: { name: string; moduleId: string }[]): Promise<void> {
    try {
      await this.prisma.permission.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
