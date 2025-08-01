import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessUnitsRepository } from './repositories/business-units.repository';
import {
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  ResponsePermissionsByModuleDto,
  PermissionActions,
  UpdateUserPermissionsDto,
} from './dto';

import { BusinessUnitEntity } from './entities/business-unit.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';

@Injectable()
export class BusinessUnitsService {
  constructor(
    private readonly businessUnitsRepo: BusinessUnitsRepository,
    private readonly permissionsRepo: PermissionsRepository,
  ) {}

  async create(
    dto: CreateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    return this.businessUnitsRepo.create(dto, userId);
  }

  async findAll(): Promise<BusinessUnitEntity[]> {
    return this.businessUnitsRepo.findAll();
  }

  async findById(id: string): Promise<BusinessUnitEntity> {
    const unit = await this.businessUnitsRepo.findById(id);
    if (!unit) throw new NotFoundException('Business unit not found');
    return unit;
  }

  async findByCompany(companyId: string): Promise<BusinessUnitEntity[]> {
    return this.businessUnitsRepo.findByCompanyId(companyId);
  }

  async update(
    id: string,
    dto: UpdateBusinessUnitDto,
    userId: string,
  ): Promise<BusinessUnitEntity> {
    const exists = await this.businessUnitsRepo.findById(id);
    if (!exists) throw new NotFoundException('Business unit not found');
    return this.businessUnitsRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.businessUnitsRepo.findById(id);
    if (!exists) throw new NotFoundException('Business unit not found');
    await this.businessUnitsRepo.remove(id, userId);
  }

  async getUserPermissionsByModule(
    businessUnitId: string,
    userId: string,
  ): Promise<ResponsePermissionsByModuleDto> {
    const userPermissions =
      await this.businessUnitsRepo.findUserPermissionsGroupedByModule(
        userId,
        businessUnitId,
      );

    const result: Record<string, PermissionActions> = {};

    for (const up of userPermissions) {
      const shortCodeModule = up.permission.module.shortCode; // ej: 'Usuarios'
      const permissionName = up.permission.name; // ej: 'user.create'

      const action = permissionName.split('.')[1]; // 'create'

      if (
        ![
          'access',
          'create',
          'read',
          'update',
          'delete',
          'export',
          'approve',
          'assign',
        ].includes(action)
      )
        continue;

      if (!result[shortCodeModule]) {
        result[shortCodeModule] = {
          access: false,
          create: false,
          read: false,
          update: false,
          delete: false,
          export: false,
          approve: false,
          assign: false,
        };
      }

      result[shortCodeModule][action] = true;
    }

    return { modules: result };
  }

  async updateUserPermissions(
    businessUnitId: string,
    userId: string,
    dto: UpdateUserPermissionsDto,
  ): Promise<void> {
    await this.permissionsRepo.updateUserPermissionsBulk(
      userId,
      businessUnitId,
      dto.permissions,
    );
  }
}
