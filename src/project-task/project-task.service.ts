import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectTaskRepository } from './repositories/project-task.repository';
import { ProjectTaskEntity } from './entities/project-task.entity';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  FilterProjectTaskDto,
  ReorderProjectTaskWrapperDto,
} from './dto';
import { StrategicProjectRepository } from 'src/strategic-project/repositories/strategic-project.repository';
import { ProjectParticipantRepository } from 'src/project-participant/repositories/project-participant.repository';

@Injectable()
export class ProjectTaskService {
  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly projectRepository: StrategicProjectRepository,
    private readonly participantRepository: ProjectParticipantRepository,
  ) {}

  // CREATE (auto-order + defaults + participant resolution)
  async createTask(
    dto: CreateProjectTaskDto,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    await this.validateTaskDates(dto.fromAt, dto.untilAt);

    // obtener projectId via factor y validar rango dentro del proyecto
    const projectId = await this.participantRepository.getProjectIdByFactorId(
      dto.projectFactorId,
    );
    if (!projectId) throw new BadRequestException('Invalid projectFactorId');

    const projectRange = await this.projectRepository.getRange(projectId);
    if (
      projectRange &&
      (dto.fromAt < projectRange.fromAt! || dto.untilAt > projectRange.untilAt!)
    ) {
      throw new BadRequestException(
        'Task dates must be inside StrategicProject range',
      );
    }

    const nextOrder = await this.taskRepository.getNextOrderForFactor(
      dto.projectFactorId,
    );

    return this.taskRepository.create({
      ...dto,
      order: nextOrder,
      status: dto.status ?? 'OPE',
      props: dto.props ?? 'N/A',
      result: dto.result ?? 'N/A',
      methodology: dto.methodology ?? 'N/A',
      budget: typeof dto.budget === 'number' ? dto.budget : 0,
      limitation: dto.limitation ?? 'N/A',
      comments: dto.comments ?? 'N/A',
      projectParticipantId: dto.projectParticipantId,
      isActive: true,
      createdBy: userId ?? null,
      updatedBy: null,
    });
  }

  // UPDATE (permite cambiar positionId → actualizar participant)
  async updateTask(
    taskId: string,
    dto: UpdateProjectTaskDto,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    const existing = await this.taskRepository.findById(taskId);
    if (!existing) throw new NotFoundException('ProjectTask not found');

    const nextFromAt = dto.fromAt ?? existing.fromAt;
    const nextUntilAt = dto.untilAt ?? existing.untilAt;
    await this.validateTaskDates(nextFromAt, nextUntilAt);

    // obtener projectId desde el factor actual o el del DTO (si lo cambiara)
    const factorId = dto.projectFactorId ?? existing.projectFactorId;
    const projectId =
      await this.participantRepository.getProjectIdByFactorId(factorId);
    if (!projectId) throw new BadRequestException('Invalid projectFactorId');

    const projectRange = await this.projectRepository.getRange(projectId);
    if (
      projectRange &&
      (nextFromAt < projectRange.fromAt! || nextUntilAt > projectRange.untilAt!)
    ) {
      throw new BadRequestException(
        'Task dates must be inside StrategicProject range',
      );
    }

    // si cambia el nombre, validamos unicidad
    if (dto.name && dto.name !== existing.name) {
      const duplicated = await this.taskRepository.existsNameInFactor(
        factorId,
        dto.name,
        taskId,
      );
      if (duplicated)
        throw new BadRequestException(
          'Task name must be unique within the factor',
        );
    }

    return this.taskRepository.update(taskId, {
      ...dto,
      fromAt: nextFromAt,
      untilAt: nextUntilAt,
      // defaults si llegan undefined
      status: dto.status ?? existing.status,
      props: dto.props ?? existing.props ?? 'N/A',
      result: dto.result ?? existing.result ?? 'N/A',
      methodology: dto.methodology ?? existing.methodology ?? 'N/A',
      budget:
        typeof dto.budget === 'number'
          ? dto.budget
          : Number(existing.budget ?? 0),
      limitation: dto.limitation ?? existing.limitation ?? 'N/A',
      comments: dto.comments ?? existing.comments ?? 'N/A',
      projectFactorId: factorId,
      updatedBy: userId ?? null,
    });
  }

  async setTaskActive(
    taskId: string,
    isActive: boolean,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    const existing = await this.taskRepository.findById(taskId);
    if (!existing) throw new NotFoundException('ProjectTask not found');
    return this.taskRepository.setActive(taskId, isActive, userId ?? null);
  }

  async getTaskById(taskId: string): Promise<ProjectTaskEntity> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('ProjectTask not found');
    return task;
  }

  async listTasksByFactor(filters: FilterProjectTaskDto) {
    return this.taskRepository.listByFactor(filters.projectFactorId, {
      status: filters.status,
      from: filters.from,
      until: filters.until,
      isActive:
        typeof filters.isActive === 'boolean' ? filters.isActive : undefined,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    });
  }

  async reorderTasks(
    wrapper: ReorderProjectTaskWrapperDto,
  ): Promise<ProjectTaskEntity[]> {
    // opcional: verificar existencia previa de IDs
    const ids = wrapper.items.map((i) => i.id);
    await this.ensureExisting(ids);

    return this.taskRepository.bulkReorderByFactor(
      wrapper.projectFactorId,
      wrapper.items,
    );
  }

  // ---- helpers ----
  private async validateTaskDates(fromAt: Date, untilAt: Date): Promise<void> {
    if (!(fromAt instanceof Date) || isNaN(fromAt.getTime())) {
      throw new BadRequestException('fromAt must be a valid Date');
    }
    if (!(untilAt instanceof Date) || isNaN(untilAt.getTime())) {
      throw new BadRequestException('untilAt must be a valid Date');
    }
    if (untilAt < fromAt) {
      throw new BadRequestException(
        'untilAt must be greater than or equal to fromAt',
      );
    }
  }

  private async ensureExisting(ids: string[]): Promise<void> {
    const checks = await Promise.all(
      ids.map((id) => this.taskRepository.findById(id)),
    );
    const missingIndex = checks.findIndex((t) => !t);
    if (missingIndex !== -1) {
      throw new NotFoundException(
        `ProjectTask not found: ${ids[missingIndex]}`,
      );
    }
  }
}
