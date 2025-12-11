import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  UpdateModulePermissionsDto,
} from './dto';
import { ResponseModuleDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { ResponsePermissionDto } from 'src/permissions/dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Permissions(PERMISSIONS.MODULES.CREATE)
  @SuccessMessage('Módulo creado exitosamente')
  async create(
    @Body() dto: CreateModuleDto,
    @UserId() userId: string,
  ): Promise<ResponseModuleDto> {
    const module = await this.modulesService.create(dto, userId);
    return new ResponseModuleDto(module);
  }

  @Get()
  @Permissions(PERMISSIONS.MODULES.READ)
  @SuccessMessage('Lista de módulos obtenida')
  async findAll(): Promise<ResponseModuleDto[]> {
    const modules = await this.modulesService.findAll();
    return modules.map((m) => new ResponseModuleDto(m));
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MODULES.READ)
  @SuccessMessage('Módulo obtenido exitosamente')
  async findOne(@Param('id') id: string): Promise<ResponseModuleDto> {
    const module = await this.modulesService.findById(id);
    return new ResponseModuleDto(module);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MODULES.UPDATE)
  @SuccessMessage('Módulo actualizado correctamente')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
    @UserId() userId: string,
  ): Promise<ResponseModuleDto> {
    const module = await this.modulesService.update(id, dto, userId);
    return new ResponseModuleDto(module);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MODULES.DELETE)
  @SuccessMessage('Módulo eliminado correctamente')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.modulesService.remove(id, userId);
  }

  @Get(':id/permissions')
  @Permissions(PERMISSIONS.MODULES.READ)
  @SuccessMessage('Permisos del módulo obtenidos exitosamente')
  async getModulePermissions(
    @Param('id') id: string,
  ): Promise<ResponsePermissionDto[]> {
    return this.modulesService.getModulePermissions(id);
  }

  @Patch(':id/permissions')
  @Permissions(PERMISSIONS.MODULES.UPDATE)
  @SuccessMessage('Permisos del módulo configurados exitosamente')
  async configureModulePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateModulePermissionsDto,
    @UserId() userId: string,
  ): Promise<void> {
    await this.modulesService.configureModulePermissions(id, dto, userId);
  }
}
