// src/features/project-tasks/controllers/project-task.controller.ts
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
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  FilterProjectTaskDto,
  ReorderProjectTaskWrapperDto,
} from './dto';
import { ProjectTaskEntity } from './entities/project-task.entity';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { ProjectTaskService } from './project-task.service';
import { UserId } from 'src/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-tasks')
export class ProjectTaskController {
  constructor(private readonly taskService: ProjectTaskService) {}

  @Permissions(PERMISSIONS.PROJECT_TASKS.CREATE)
  @SuccessMessage('Tarea creada correctamente')
  @Post()
  async createTask(
    @Body() dto: CreateProjectTaskDto,
    @UserId() userId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.createTask(dto, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get()
  async listTasks(@Query() filters: FilterProjectTaskDto): Promise<{
    items: ProjectTaskEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.taskService.listTasksByFactor(filters);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get(':id')
  async getTask(@Param('id') taskId: string): Promise<ProjectTaskEntity> {
    return this.taskService.getTaskById(taskId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.UPDATE)
  @SuccessMessage('Orden de tareas actualizado correctamente')
  @Patch('reorder')
  async reorderTasks(
    @Body() wrapper: ReorderProjectTaskWrapperDto,
  ): Promise<ProjectTaskEntity[]> {
    return this.taskService.reorderTasks(wrapper);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.UPDATE)
  @SuccessMessage('Estado de tarea actualizado correctamente')
  @Patch(':id/active')
  async toggleTaskActive(
    @Param('id') taskId: string,
    @Body() body: { isActive: boolean },
    @UserId() userId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.setTaskActive(taskId, body.isActive, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.UPDATE)
  @SuccessMessage('Tarea actualizada correctamente')
  @Patch(':id')
  async updateTask(
    @Param('id') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @UserId() userId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.updateTask(taskId, dto, userId);
  }
}
