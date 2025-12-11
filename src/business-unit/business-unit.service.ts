import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessUnitsRepository } from './repositories/business-units.repository';
import {
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  UpdateUserPermissionsDto,
} from './dto';

import { BusinessUnitEntity } from './entities/business-unit.entity';
import { PermissionsRepository } from '../permissions/repositories/permissions.repository';
import { UsersRepository } from '../users/repositories/users.repository';

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

  async getUserPermissionsByModule(businessUnitId: string, userId: string) {
    // Validamos que el usuario y la BU existan
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const bu = await this.businessUnitsRepo.findById(businessUnitId);
    if (!bu) throw new NotFoundException('Unidad de negocio no encontrada');

    return this.businessUnitsRepo.findAllPermissionsWithUserStatus(
      userId,
      businessUnitId,
    );
  }

  async updateUserPermissions(
    businessUnitId: string,
    userId: string,
    dto: UpdateUserPermissionsDto,
    actorId: string,
  ): Promise<void> {
    // Validamos que el usuario y la BU existan
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const bu = await this.businessUnitsRepo.findById(businessUnitId);
    if (!bu) throw new NotFoundException('Unidad de negocio no encontrada');

    await this.permissionsRepo.updateUserPermissionsBulk(
      userId,
      businessUnitId,
      dto.permissions,
      actorId,
    );
  }
}
