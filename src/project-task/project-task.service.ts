import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectTaskRepository } from './repositories/project-task.repository';
import {
  ProjectTaskEntity,
  TaskParticipantEntity,
} from './entities/project-task.entity';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  FilterProjectTaskDto,
  ReorderProjectTaskWrapperDto,
  AddTaskParticipantsDto,
  RemoveTaskParticipantDto,
} from './dto';
import { StrategicProjectRepository } from 'src/strategic-project/repositories/strategic-project.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectTaskService {
  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly projectRepository: StrategicProjectRepository,
    private readonly prisma: PrismaService,
  ) {}

  // CREATE (auto-order + defaults + participant resolution)
  async createTask(
    dto: CreateProjectTaskDto,
    companyId: string,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    await this.validateTaskDates(dto.fromAt, dto.untilAt);

    // obtener projectId via factor y validar rango dentro del proyecto
    const projectId = await this.taskRepository.getProjectIdByFactorId(
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

    // Separar participantes del DTO
    const participantsInput = dto.participants ?? [];
    const { participants: _p, ...taskData } = dto as any;

    // Crear la tarea
    const task = await this.taskRepository.create({
      ...taskData,
      order: nextOrder,
      status: dto.status ?? 'OPE',
      props: dto.props ?? '',
      result: dto.result ?? '',
      methodology: dto.methodology ?? '',
      budget: typeof dto.budget === 'number' ? dto.budget : 0,
      limitation: dto.limitation ?? '',
      comments: dto.comments ?? '',
      isActive: true,
      createdBy: userId ?? null,
      updatedBy: null,
    });

    // Procesar participantes si existen
    if (participantsInput.length > 0) {
      const processedParticipants = await this.processParticipants(
        task.id,
        participantsInput,
        companyId,
        userId,
      );
      // Recargar tarea con participantes
      return this.taskRepository.findById(
        task.id,
        companyId,
      ) as Promise<ProjectTaskEntity>;
    }

    return task;
  }

  private async processParticipants(
    taskId: string,
    participants: {
      positionId?: string;
      externalUserId?: string;
      name?: string;
      email?: string;
    }[],
    companyId: string,
    userId: string,
  ): Promise<TaskParticipantEntity[]> {
    const processed: { positionId?: string; externalUserId?: string }[] = [];

    for (const p of participants) {
      if (p.positionId) {
        // Cargo interno - usar directamente
        processed.push({ positionId: p.positionId });
      } else if (p.externalUserId) {
        // Usuario externo por ID - usar directamente
        processed.push({ externalUserId: p.externalUserId });
      } else if (p.email) {
        // Buscar o crear externo por email
        const externalUser = await this.findOrCreateExternalUser(
          p.name!,
          p.email,
          companyId,
          userId,
        );
        processed.push({ externalUserId: externalUser.id });
      }
    }

    if (processed.length > 0) {
      return this.taskRepository.addParticipants(taskId, processed, userId);
    }

    return [];
  }

  private async findOrCreateExternalUser(
    name: string,
    email: string,
    companyId: string,
    userId: string,
  ) {
    // Buscar por email y companyId
    const existing = await this.prisma.externalUser.findUnique({
      where: { companyId_email: { companyId, email: email.toLowerCase() } },
    });

    if (existing) {
      return existing;
    }

    // Crear nuevo
    return this.prisma.externalUser.create({
      data: {
        name,
        email: email.toLowerCase(),
        companyId,
        createdBy: userId,
      },
    });
  }

  // UPDATE (permite cambiar positionId → actualizar participant)
  async updateTask(
    taskId: string,
    dto: UpdateProjectTaskDto,
    companyId: string,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    const existing = await this.taskRepository.findById(taskId, companyId);
    if (!existing) throw new NotFoundException('ProjectTask not found');

    const nextFromAt = dto.fromAt ?? existing.fromAt;
    const nextUntilAt = dto.untilAt ?? existing.untilAt;
    await this.validateTaskDates(nextFromAt, nextUntilAt);

    // obtener projectId desde el factor actual o el del DTO (si lo cambiara)
    const factorId = dto.projectFactorId ?? existing.projectFactorId;
    const projectId =
      await this.taskRepository.getProjectIdByFactorId(factorId);
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

    // Separar participantes del DTO
    const participantsInput = (dto as any).participants;
    const { participants: _p, ...taskData } = dto as any;

    const updated = await this.taskRepository.update(taskId, {
      ...taskData,
      fromAt: nextFromAt,
      untilAt: nextUntilAt,
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

    // Procesar participantes si vienen en el DTO
    if (participantsInput && participantsInput.length > 0) {
      await this.processParticipants(
        taskId,
        participantsInput,
        companyId,
        userId,
      );
      return this.taskRepository.findById(
        taskId,
        companyId,
      ) as Promise<ProjectTaskEntity>;
    }

    return updated;
  }

  async setTaskActive(
    taskId: string,
    isActive: boolean,
    userId: string,
  ): Promise<ProjectTaskEntity> {
    const existing = await this.taskRepository.findById(taskId, undefined);
    if (!existing) throw new NotFoundException('ProjectTask not found');
    return this.taskRepository.setActive(taskId, isActive, userId ?? null);
  }

  async getTaskById(
    taskId: string,
    companyId?: string,
  ): Promise<ProjectTaskEntity> {
    const task = await this.taskRepository.findById(taskId, companyId);
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

  private async ensureExisting(
    ids: string[],
    companyId?: string,
  ): Promise<void> {
    const checks = await Promise.all(
      ids.map((id) => this.taskRepository.findById(id, companyId)),
    );
    const missingIndex = checks.findIndex((t) => !t);
    if (missingIndex !== -1) {
      throw new NotFoundException(
        `ProjectTask not found: ${ids[missingIndex]}`,
      );
    }
  }

  async getParticipants(
    taskId: string,
    companyId?: string,
  ): Promise<TaskParticipantEntity[]> {
    const task = await this.taskRepository.findById(taskId, companyId);
    if (!task) throw new NotFoundException('ProjectTask not found');
    return this.taskRepository.getParticipants(taskId, companyId);
  }

  async addParticipants(
    taskId: string,
    dto: AddTaskParticipantsDto,
    companyId: string,
    userId: string,
  ): Promise<TaskParticipantEntity[]> {
    const task = await this.taskRepository.findById(taskId, companyId);
    if (!task) throw new NotFoundException('ProjectTask not found');
    return this.taskRepository.addParticipants(
      taskId,
      dto.participants,
      companyId,
      userId ?? null,
    );
  }

  async removeParticipant(
    taskId: string,
    participantId: string,
  ): Promise<void> {
    const task = await this.taskRepository.findById(taskId, undefined);
    if (!task) throw new NotFoundException('ProjectTask not found');
    await this.taskRepository.removeParticipant(participantId);
  }

  async setParticipants(
    taskId: string,
    dto: AddTaskParticipantsDto,
    companyId: string,
    userId: string,
  ): Promise<TaskParticipantEntity[]> {
    const task = await this.taskRepository.findById(taskId, companyId);
    if (!task) throw new NotFoundException('ProjectTask not found');
    return this.taskRepository.setParticipants(
      taskId,
      dto.participants,
      companyId,
      userId ?? null,
    );
  }
}
