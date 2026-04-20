// src/features/project-tasks/controllers/project-task.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  AddTaskParticipantsDto,
  RemoveTaskParticipantDto,
} from './dto';
import { ProjectTaskEntity } from './entities/project-task.entity';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { ProjectTaskService } from './project-task.service';
import { CompanyId } from 'src/common/decorators/company-id.decorator';
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
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.createTask(dto, companyId, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get()
  async listTasks(
    @Query() filters: FilterProjectTaskDto,
  ): Promise<ProjectTaskEntity[]> {
    const result = await this.taskService.listTasksByFactor(filters);
    return result.items;
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get(':id')
  async getTask(
    @Param('id') taskId: string,
    @CompanyId() companyId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.getTaskById(taskId, companyId);
  }

  @Permissions(
    PERMISSIONS.PROJECT_TASKS.UPDATE,
    PERMISSIONS.PROJECT_TASKS.REORDER,
  )
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
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ): Promise<ProjectTaskEntity> {
    return this.taskService.updateTask(taskId, dto, companyId, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.READ)
  @Get(':id/participants')
  async getParticipants(
    @Param('id') taskId: string,
    @CompanyId() companyId: string,
  ): Promise<any[]> {
    return this.taskService.getParticipants(taskId, companyId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.CREATE)
  @SuccessMessage('Participantes agregados correctamente')
  @Post(':id/participants')
  async addParticipants(
    @Param('id') taskId: string,
    @Body() dto: AddTaskParticipantsDto,
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ) {
    return this.taskService.addParticipants(taskId, dto, companyId, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.CREATE)
  @SuccessMessage('Participantes actualizados correctamente')
  @Patch(':id/participants')
  async setParticipants(
    @Param('id') taskId: string,
    @Body() dto: AddTaskParticipantsDto,
    @CompanyId() companyId: string,
    @UserId() userId: string,
  ) {
    return this.taskService.setParticipants(taskId, dto, companyId, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_TASKS.DELETE)
  @SuccessMessage('Participante eliminado correctamente')
  @Delete(':id/participants/:participantId')
  async removeParticipant(
    @Param('id') taskId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.taskService.removeParticipant(taskId, participantId);
  }
}
