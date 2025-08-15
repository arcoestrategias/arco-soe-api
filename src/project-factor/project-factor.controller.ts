import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateProjectFactorDto,
  UpdateProjectFactorDto,
  FilterProjectFactorDto,
  ReorderProjectFactorWrapperDto,
} from './dto';
import { ProjectFactorEntity } from './entities/project-factor.entity';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { ProjectFactorService } from './project-factor.service';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-factors')
export class ProjectFactorController {
  constructor(private readonly factorService: ProjectFactorService) {}

  @Permissions(PERMISSIONS.PROJECT_FACTORS.CREATE)
  @SuccessMessage('Factor creado correctamente')
  @Post()
  async createFactor(
    @Body() dto: CreateProjectFactorDto,
    @UserId() userId: string,
  ): Promise<ProjectFactorEntity> {
    return this.factorService.createFactor(dto, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_FACTORS.READ)
  @Get()
  async listFactors(@Query() filters: FilterProjectFactorDto): Promise<{
    items: ProjectFactorEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    console.log(filters);
    return this.factorService.listFactorsByProject(filters);
  }

  @Permissions(PERMISSIONS.PROJECT_FACTORS.READ)
  @Get(':id')
  async getFactor(@Param('id') factorId: string): Promise<ProjectFactorEntity> {
    return this.factorService.getFactorById(factorId);
  }

  @Permissions(PERMISSIONS.PROJECT_FACTORS.UPDATE)
  @SuccessMessage('Orden de factores actualizado correctamente')
  @Patch('reorder')
  async reorderFactors(
    @Body() wrapper: ReorderProjectFactorWrapperDto,
  ): Promise<ProjectFactorEntity[]> {
    return this.factorService.reorderFactors(wrapper);
  }

  @Permissions(PERMISSIONS.PROJECT_FACTORS.UPDATE)
  @SuccessMessage('Factor actualizado correctamente')
  @Patch(':id')
  async updateFactor(
    @Param('id') factorId: string,
    @Body() dto: UpdateProjectFactorDto,
    @UserId() userId: string,
  ): Promise<ProjectFactorEntity> {
    return this.factorService.updateFactor(factorId, dto, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_FACTORS.UPDATE)
  @SuccessMessage('Estado de factor actualizado correctamente')
  @Patch(':id/active')
  async toggleFactorActive(
    @Param('id') factorId: string,
    @Body() body: { isActive: boolean },
    @UserId() userId: string,
  ): Promise<ProjectFactorEntity> {
    return this.factorService.setFactorActive(factorId, body.isActive, userId);
  }
}
