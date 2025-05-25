import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  ResponseRoleDto,
  AssignPermissionsDto,
} from './dto';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(PERMISSIONS.ROLES.CREATE)
  @SuccessMessage('Rol creado correctamente')
  async create(@Body() dto: CreateRoleDto): Promise<ResponseRoleDto> {
    const role = await this.rolesService.create(dto);
    return new ResponseRoleDto(role);
  }

  @Get()
  @Permissions(PERMISSIONS.ROLES.READ)
  @SuccessMessage('Roles obtenidos correctamente')
  async findAll(): Promise<ResponseRoleDto[]> {
    const roles = await this.rolesService.findAll();
    return roles.map((r) => new ResponseRoleDto(r));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ROLES.READ)
  async findOne(@Param('id') id: string): Promise<ResponseRoleDto> {
    const role = await this.rolesService.findById(id);
    return new ResponseRoleDto(role);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ROLES.UPDATE)
  @SuccessMessage('Rol actualizado correctamente')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ResponseRoleDto> {
    const role = await this.rolesService.update(id, dto);
    return new ResponseRoleDto(role);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ROLES.DELETE)
  @SuccessMessage('Rol eliminado correctamente')
  async remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove(id);
  }

  @Patch(':id/permissions')
  @Permissions(PERMISSIONS.ROLES.ASSIGN)
  @SuccessMessage('Permisos asignados correctamente')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<void> {
    return this.rolesService.assignPermissions({ ...dto, roleId: id });
  }

  @Get(':id/permissions')
  @Permissions(PERMISSIONS.ROLES.READ)
  async getPermissions(@Param('id') id: string) {
    return this.rolesService.findWithPermissions(id);
  }
}
