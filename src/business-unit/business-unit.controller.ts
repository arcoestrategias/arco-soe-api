import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  ResponseBusinessUnitDto,
  UpdateUserPermissionsDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { BusinessUnitsService } from './business-unit.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('business-units')
export class BusinessUnitsController {
  constructor(
    private readonly businessUnitService: BusinessUnitsService,
    private readonly usersService: UsersService,
  ) {}

  @Permissions(PERMISSIONS.BUSINESS_UNITS.CREATE)
  @SuccessMessage('Unidad de negocio creada exitosamente')
  @Post()
  async create(
    @Body() dto: CreateBusinessUnitDto,
    @UserId() userId: string,
  ): Promise<ResponseBusinessUnitDto> {
    const unit = await this.businessUnitService.create(dto, userId);
    return new ResponseBusinessUnitDto(unit);
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.READ)
  @Get(':businessUnitId/users')
  async listUsersInBU(@Param('businessUnitId') businessUnitId: string) {
    return this.usersService.listByBusinessUnitId(businessUnitId);
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.READ)
  @Get()
  async findAll(): Promise<ResponseBusinessUnitDto[]> {
    const units = await this.businessUnitService.findAll();
    return units.map((u) => new ResponseBusinessUnitDto(u));
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseBusinessUnitDto> {
    const unit = await this.businessUnitService.findById(id);
    return new ResponseBusinessUnitDto(unit);
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.READ)
  @Get('/company/:companyId')
  async findByCompany(
    @Param('companyId') companyId: string,
  ): Promise<ResponseBusinessUnitDto[]> {
    const units = await this.businessUnitService.findByCompany(companyId);
    return units.map((u) => new ResponseBusinessUnitDto(u));
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.UPDATE)
  @SuccessMessage('Unidad de negocio actualizada correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessUnitDto,
    @UserId() userId: string,
  ): Promise<ResponseBusinessUnitDto> {
    const unit = await this.businessUnitService.update(id, dto, userId);
    return new ResponseBusinessUnitDto(unit);
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.DELETE)
  @SuccessMessage('Unidad de negocio eliminada correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.businessUnitService.remove(id, userId);
  }

  @Permissions(PERMISSIONS.BUSINESS_UNITS.READ)
  @Get(':businessUnitId/users/:userId/permissions')
  async getUserPermissionsByModule(
    @Param('businessUnitId', ParseUUIDPipe) businessUnitId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.businessUnitService.getUserPermissionsByModule(
      businessUnitId,
      userId,
    );
  }

  @Permissions(
    PERMISSIONS.BUSINESS_UNITS.UPDATE,
    PERMISSIONS.USERS.SET_PERMISSIONS,
  )
  @SuccessMessage('Permisos actualizados correctamente')
  @Patch(':businessUnitId/users/:userId/permissions')
  async updateUserPermissions(
    @Param('businessUnitId', ParseUUIDPipe) businessUnitId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserPermissionsDto,
    @UserId() actorId: string,
  ): Promise<void> {
    await this.businessUnitService.updateUserPermissions(
      businessUnitId,
      userId,
      dto,
      actorId,
    );
  }

  @Permissions(
    PERMISSIONS.BUSINESS_UNITS.UPDATE,
    PERMISSIONS.USERS.SET_PERMISSIONS,
  )
  @SuccessMessage('Permisos reestablecidos al rol correctamente')
  @Post(':businessUnitId/users/:userId/permissions/reset')
  async resetUserPermissions(
    @Param('businessUnitId', ParseUUIDPipe) businessUnitId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @UserId() actorId: string,
  ): Promise<void> {
    await this.businessUnitService.resetUserPermissions(
      businessUnitId,
      userId,
      actorId,
    );
  }
}
