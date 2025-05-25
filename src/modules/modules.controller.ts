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
import { CreateModuleDto, UpdateModuleDto } from './dto';
import { ResponseModuleDto } from './dto/response-module.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Permissions(PERMISSIONS.MODULES.CREATE)
  @SuccessMessage('Módulo creado exitosamente')
  @Post()
  async create(@Body() dto: CreateModuleDto): Promise<ResponseModuleDto> {
    const module = await this.modulesService.create(dto);
    return new ResponseModuleDto(module);
  }

  @Permissions(PERMISSIONS.MODULES.READ)
  @Get()
  async findAll(): Promise<ResponseModuleDto[]> {
    const modules = await this.modulesService.findAll();
    return modules.map((m) => new ResponseModuleDto(m));
  }

  @Permissions(PERMISSIONS.MODULES.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponseModuleDto> {
    const module = await this.modulesService.findById(id);
    return new ResponseModuleDto(module);
  }

  @Permissions(PERMISSIONS.MODULES.UPDATE)
  @SuccessMessage('Módulo actualizado correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
  ): Promise<ResponseModuleDto> {
    const module = await this.modulesService.update(id, dto);
    return new ResponseModuleDto(module);
  }

  @Permissions(PERMISSIONS.MODULES.DELETE)
  @SuccessMessage('Módulo eliminado correctamente')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.modulesService.remove(id);
  }
}
