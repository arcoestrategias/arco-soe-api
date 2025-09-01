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
import { UsersRepository } from '../users/repositories/users.repository';

const ALLOWED_ACTIONS: Array<keyof PermissionActions> = [
  'access',
  'create',
  'read',
  'update',
  'delete',
  'export',
  'approve',
  'assign',
];

function emptyActions(): PermissionActions {
  return {
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

@Injectable()
export class BusinessUnitsService {
  constructor(
    private readonly businessUnitsRepo: BusinessUnitsRepository,
    private readonly permissionsRepo: PermissionsRepository,
    private readonly usersRepo: UsersRepository,
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

  // async listUsersInBusinessUnit(businessUnitId: string) {
  //   const bu = await this.businessUnitsRepo.findById(businessUnitId);
  //   if (!bu) throw new NotFoundException('Business unit not found');
  //   return this.usersRepo.findByBusinessUnitId(businessUnitId);
  // }

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
  ): Promise<{ modules: Record<string, PermissionActions> }> {
    // 1) Tu lógica intacta: solo trues desde UserPermission
    const userPermissions =
      await this.businessUnitsRepo.findUserPermissionsGroupedByModule(
        userId,
        businessUnitId,
      );

    const result: Record<string, PermissionActions> = {};

    for (const up of userPermissions) {
      const shortCodeModule = up.permission.module.shortCode; // ej: 'user'
      const permissionName = up.permission.name; // ej: 'user.create'
      const action = permissionName.split('.')[1] as keyof PermissionActions;

      if (!ALLOWED_ACTIONS.includes(action)) continue;

      if (!result[shortCodeModule]) {
        result[shortCodeModule] = emptyActions();
      }
      result[shortCodeModule][action] = true;
    }

    // 2) Relleno: asegura que salgan TODOS los módulos/acciones (false si no hubo filas)
    const skeleton = await this.businessUnitsRepo.findModulesActionSkeleton();

    for (const mod of skeleton) {
      if (!result[mod.shortCode]) {
        // módulo totalmente vacío: todo false
        result[mod.shortCode] = emptyActions();
      } else {
        // módulo presente pero faltan acciones: complétalas en false
        for (const action of mod.actions) {
          if (result[mod.shortCode][action] === undefined) {
            result[mod.shortCode][action] = false;
          }
        }
        // si quieres forzar que existan siempre las 8 acciones, asegura todas:
        for (const a of ALLOWED_ACTIONS) {
          if (result[mod.shortCode][a] === undefined) {
            result[mod.shortCode][a] = false;
          }
        }
      }
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
