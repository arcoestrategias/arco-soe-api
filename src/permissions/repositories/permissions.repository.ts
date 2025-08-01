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

  async assignUserPermission(data: {
    userId: string;
    permissionId: string;
    businessUnitId: string;
  }) {
    return this.prisma.userPermission.create({
      data: {
        ...data,
      },
    });
  }

  async updateUserPermissionsBulk(
    userId: string,
    businessUnitId: string,
    permissionMap: Record<string, boolean>,
  ): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        name: { in: Object.keys(permissionMap) },
      },
    });

    const updates = permissions.map((p) =>
      this.prisma.userPermission.upsert({
        where: {
          userId_businessUnitId_permissionId: {
            userId,
            businessUnitId,
            permissionId: p.id,
          },
        },
        update: {
          isAllowed: permissionMap[p.name],
        },
        create: {
          userId,
          businessUnitId,
          permissionId: p.id,
          isAllowed: permissionMap[p.name],
        },
      }),
    );

    await this.prisma.$transaction(updates);
  }
}
