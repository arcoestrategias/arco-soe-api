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
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  ResponsePermissionDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Permissions(PERMISSIONS.PERMISSIONS.CREATE)
  @SuccessMessage('Permiso creado exitosamente')
  @Post()
  async create(
    @Body() dto: CreatePermissionDto,
    @UserId() userId: string,
  ): Promise<ResponsePermissionDto> {
    const permission = await this.permissionsService.create(dto, userId);
    return new ResponsePermissionDto(permission);
  }

  @Permissions(PERMISSIONS.PERMISSIONS.READ)
  @Get()
  async findAll(): Promise<ResponsePermissionDto[]> {
    const permissions = await this.permissionsService.findAll();
    return permissions.map((p) => new ResponsePermissionDto(p));
  }

  @Permissions(PERMISSIONS.PERMISSIONS.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponsePermissionDto> {
    const permission = await this.permissionsService.findById(id);
    return new ResponsePermissionDto(permission);
  }

  @Permissions(PERMISSIONS.PERMISSIONS.UPDATE)
  @SuccessMessage('Permiso actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @UserId() userId: string,
  ): Promise<ResponsePermissionDto> {
    const permission = await this.permissionsService.update(id, dto, userId);
    return new ResponsePermissionDto(permission);
  }

  @Permissions(PERMISSIONS.PERMISSIONS.DELETE)
  @SuccessMessage('Permiso eliminado correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.permissionsService.remove(id, userId);
  }
}
