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
  CreateStrategicProjectDto,
  UpdateStrategicProjectDto,
  FilterStrategicProjectDto,
  ReorderStrategicProjectWrapperDto,
  ToggleActiveStrategicProjectDto,
  ResponseStrategicProjectDto,
  ListProjectStructureDto,
  CountOverdueProjectsDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { StrategicProjectService } from './strategic-project.service';
import { ListStrategicProjectsByPlanAndPositionDto } from './dto/list-by-plan-and-position.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('strategic-projects')
export class StrategicProjectController {
  constructor(private readonly projectService: StrategicProjectService) {}

  // CREATE
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.CREATE)
  @SuccessMessage('Proyecto estratégico creado correctamente')
  @Post()
  async createProject(
    @Body() dto: CreateStrategicProjectDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicProjectDto> {
    return this.projectService.createStrategicProject(dto, userId);
  }

  @Get(':projectId/structure')
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  getProjectStructure(
    @Param('projectId') projectId: string,
    @Query('includeInactiveFactors') incF?: string,
    @Query('includeInactiveTasks') incT?: string,
    @Query('includeInactiveParticipants') incP?: string,
  ) {
    return this.projectService.getProjectStructure({
      projectId,
      includeInactiveFactors: incF === 'true',
      includeInactiveTasks: incT === 'true',
      includeInactiveParticipants: incP === 'true',
    });
  }

  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get('dashboard')
  getDashboard(
    @Query() q: ListProjectStructureDto,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const m = month ? Number(month) : undefined;
    const y = year ? Number(year) : undefined;
    return this.projectService.getProjectsDashboard(q, m, y);
  }

  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get()
  async listByPlanAndPosition(
    @Query() query: ListStrategicProjectsByPlanAndPositionDto,
  ): Promise<ResponseStrategicProjectDto[]> {
    return await this.projectService.listByPlanAndPosition(query);
  }

  /**
   * GET /strategic-projects/structure?strategicPlanId=...&positionId?=...
   * - Solo proyectos activos.
   * - Sin positionId: agrupado por positionId.
   * - Con positionId: lista plana.
   */
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get('structure')
  getStructureAllProjects(@Query() q: ListProjectStructureDto) {
    return this.projectService.listProjectStructure(q);
  }

  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @SuccessMessage('Conteo de proyectos atrasados por posición')
  @Get('overdue/count')
  countOverdue(@Query() q: CountOverdueProjectsDto) {
    return this.projectService.countOverdueProjectsByPosition(q);
  }

  // LIST
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get()
  async listProjects(@Query() filters: FilterStrategicProjectDto): Promise<{
    items: ResponseStrategicProjectDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.projectService.listStrategicProjects(filters);
  }

  // DETAIL
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get(':id')
  async getProjectById(
    @Param('id') projectId: string,
  ): Promise<ResponseStrategicProjectDto> {
    return this.projectService.getStrategicProjectById(projectId);
  }

  // PROGRESS
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.READ)
  @Get(':id/progress')
  async getProjectProgress(
    @Param('id') projectId: string,
  ): Promise<ResponseStrategicProjectDto> {
    return this.projectService.getStrategicProjectWithProgress(projectId);
  }

  // REORDER
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.UPDATE)
  @SuccessMessage('Orden de proyectos actualizado correctamente')
  @Patch('reorder')
  async reorderProjects(
    @Body() wrapper: ReorderStrategicProjectWrapperDto,
  ): Promise<ResponseStrategicProjectDto[]> {
    return this.projectService.reorderStrategicProjects(wrapper);
  }

  // UPDATE
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.UPDATE)
  @SuccessMessage('Proyecto estratégico actualizado correctamente')
  @Patch(':id')
  async updateProject(
    @Param('id') projectId: string,
    @Body() dto: UpdateStrategicProjectDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicProjectDto> {
    return this.projectService.updateStrategicProject(projectId, dto, userId);
  }

  // TOGGLE ACTIVE / SOFT DELETE
  @Permissions(PERMISSIONS.STRATEGIC_PROJECTS.UPDATE)
  @SuccessMessage('Estado de proyecto actualizado correctamente')
  @Patch(':id/active')
  async toggleProjectActive(
    @Param('id') projectId: string,
    @Body() dto: ToggleActiveStrategicProjectDto,
    @UserId() userId: string,
  ): Promise<ResponseStrategicProjectDto> {
    return this.projectService.setStrategicProjectActive(
      projectId,
      dto.isActive,
      userId,
    );
  }
}
