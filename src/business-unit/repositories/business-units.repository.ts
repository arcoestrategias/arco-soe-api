import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';

import { BusinessUnitEntity } from '../entities/business-unit.entity';
import { CreateBusinessUnitDto, UpdateBusinessUnitDto } from '../dto';

@Injectable()
export class BusinessUnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    try {
      const unit = await this.prisma.businessUnit.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new BusinessUnitEntity(unit);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<BusinessUnitEntity[]> {
    const units = await this.prisma.businessUnit.findMany({
      orderBy: { name: 'asc' },
    });
    return units.map((u) => new BusinessUnitEntity(u));
  }

  async findById(id: string): Promise<BusinessUnitEntity | null> {
    const unit = await this.prisma.businessUnit.findUnique({
      where: { id },
    });
    return unit ? new BusinessUnitEntity(unit) : null;
  }

  async findByCompanyId(companyId: string): Promise<BusinessUnitEntity[]> {
    const units = await this.prisma.businessUnit.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });
    return units.map((u) => new BusinessUnitEntity(u));
  }

  async update(
    id: string,
    data: UpdateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    try {
      const unit = await this.prisma.businessUnit.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new BusinessUnitEntity(unit);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.businessUnit.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAllPermissionsWithUserStatus(
    userId: string,
    businessUnitId: string,
  ) {
    // 1. Obtener todos los permisos activos del sistema (Catálogo)
    const allPermissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      include: {
        module: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 2. Obtener los permisos que YA tiene asignados el usuario en esta BU
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId, businessUnitId, isAllowed: true },
      select: { permissionId: true },
    });

    const userPermissionIds = new Set(
      userPermissions.map((up) => up.permissionId),
    );

    // 3. Mapear y marcar isAllowed
    return allPermissions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      module: p.module.name,
      isAllowed: userPermissionIds.has(p.id),
    }));
  }

  async findCompanyIdByBusinessUnit(
    businessUnitId: string,
  ): Promise<string | null> {
    const row = await this.prisma.businessUnit.findUnique({
      where: { id: businessUnitId },
      select: { companyId: true },
    });
    return row?.companyId ?? null;
  }
}
