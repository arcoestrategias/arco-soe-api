// src/features/strategic-projects/services/strategic-project.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ReorderItem,
  StrategicProjectRepository,
} from './repositories/strategic-project.repository';
import { StrategicProjectEntity } from './entities/strategic-project.entity';
import {
  CreateStrategicProjectDto,
  UpdateStrategicProjectDto,
  FilterStrategicProjectDto,
  ReorderStrategicProjectWrapperDto,
  ListProjectStructureDto,
  CountOverdueProjectsDto,
} from './dto';
import { StrategicPlanRepository } from 'src/strategic-plan/repositories/strategic-plan.repository';
import { ProjectParticipantRepository } from 'src/project-participant/repositories/project-participant.repository';
import { ProjectFactorRepository } from 'src/project-factor/repositories/project-factor.repository';

@Injectable()
export class StrategicProjectService {
  constructor(
    private readonly projectRepository: StrategicProjectRepository,
    private readonly planRepository: StrategicPlanRepository,
    private readonly projectFactorRepository: ProjectFactorRepository,
    private readonly projectParticipantRepository: ProjectParticipantRepository,
  ) {}

  // ---------- Create ----------
  async createStrategicProject(
    dto: CreateStrategicProjectDto,
    userId: string,
  ): Promise<StrategicProjectEntity> {
    // Validaciones de fechas
    await this.validateProjectDates(dto.fromAt, dto.untilAt);
    await this.validateDatesInsidePlan(
      dto.strategicPlanId,
      dto.fromAt,
      dto.untilAt,
    );

    // Calcular orden
    const nextOrder = await this.projectRepository.getNextOrderForPlan(
      dto.strategicPlanId,
    );

    // Crear proyecto
    const project = await this.projectRepository.create({
      ...dto,
      description: dto.description ?? null,
      order: nextOrder,
      objectiveId: dto.objectiveId ?? null,
      isActive: true,
      createdBy: userId ?? null,
      updatedBy: null,
    });

    // Crear participante inicial para este proyecto
    const participant = await this.projectParticipantRepository.findOrCreate(
      project.id,
      dto.positionId,
    );

    return Object.assign(new StrategicProjectEntity(project), {
      projectParticipantId: participant.id,
    });
  }

  // ---------- Update ----------
  async updateStrategicProject(
    id: string,
    dto: UpdateStrategicProjectDto,
    userId: string,
  ) {
    const existing = await this.projectRepository.findById(id);
    if (!existing) throw new NotFoundException('StrategicProject not found');

    const nextFromAt = dto.fromAt ?? existing.fromAt;
    const nextUntilAt = dto.untilAt ?? existing.untilAt;

    await this.validateProjectDates(nextFromAt, nextUntilAt);
    await this.validateDatesInsidePlan(
      existing.strategicPlanId,
      nextFromAt,
      nextUntilAt,
    );

    return this.projectRepository.update(id, {
      ...dto,
      description: dto.description ?? existing.description ?? null,
      fromAt: nextFromAt,
      untilAt: nextUntilAt,
      order: typeof dto.order === 'number' ? dto.order : existing.order,
      objectiveId: dto.objectiveId ?? existing.objectiveId ?? null,
      updatedBy: userId ?? null,
    });
  }

  // ---------- Toggle Active / Soft Delete ----------
  async setStrategicProjectActive(
    projectId: string,
    isActive: boolean,
    userId: string,
  ): Promise<StrategicProjectEntity> {
    const existing = await this.projectRepository.findById(projectId);
    if (!existing) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    // 1) cambia estado del proyecto
    const updated = await this.projectRepository.setActive(
      projectId,
      isActive,
      userId ?? null,
    );

    // 2) sincroniza factores y tareas en cascada
    await this.projectFactorRepository.setActiveByProject(
      projectId,
      isActive,
      userId ?? null,
    );

    return updated;
  }

  // ---------- Get by Id (simple) ----------
  async getStrategicProjectById(
    projectId: string,
  ): Promise<StrategicProjectEntity & { projectParticipantId: string | null }> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('StrategicProject not found');

    const owner =
      await this.projectParticipantRepository.findOwnerForProject(projectId);

    return Object.assign(new StrategicProjectEntity(project), {
      projectParticipantId: owner?.id ?? null,
    });
  }

  // ---------- Get by Id with Progress ----------
  async getStrategicProjectWithProgress(
    projectId: string,
  ): Promise<StrategicProjectEntity> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('StrategicProject not found');
    }

    const factorCounts =
      await this.projectRepository.getFactorTaskAggregates(projectId);
    const progress = this.calculateProjectProgressFromAggregates(factorCounts);

    // Devolvemos una Entity enriquecida con progress (campo calculado)
    return new StrategicProjectEntity({ ...project, progress });
  }

  // ---------- List / Filter ----------
  async listStrategicProjects(filters: FilterStrategicProjectDto): Promise<{
    items: Array<
      StrategicProjectEntity & { projectParticipantId: string | null }
    >;
    total: number;
    page: number;
    limit: number;
  }> {
    const pageData = await this.projectRepository.findMany({
      strategicPlanId: filters.strategicPlanId,
      objectiveId: filters.objectiveId,
      q: filters.q,
      from: filters.from,
      until: filters.until,
      isActive:
        typeof filters.isActive === 'boolean' ? filters.isActive : undefined,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      orderBy: filters.orderBy ?? 'createdAt',
      orderDir: filters.orderDir ?? 'desc',
      positionId: filters.positionId, // ✅ pásalo al repo
    });

    // Si el repo ya devuelve un campo participantsLite o similar, úsalo.
    // Si no, hacemos fan-out como fallback:
    if (!('participantsLite' in (pageData.items?.[0] ?? {}))) {
      const itemsWithParticipant = await Promise.all(
        pageData.items.map(async (p) => {
          const owner = filters.positionId
            ? await this.projectParticipantRepository.findByProjectAndPosition(
                p.id,
                filters.positionId!,
              )
            : await this.projectParticipantRepository.findOwnerForProject(p.id);
          return Object.assign(new StrategicProjectEntity(p), {
            projectParticipantId: owner?.id ?? null,
          });
        }),
      );
      return { ...pageData, items: itemsWithParticipant };
    }

    // (si el repo ya trae participantsLite)
    const items = pageData.items.map((p: any) =>
      Object.assign(new StrategicProjectEntity(p), {
        projectParticipantId: p.participantsLite?.[0]?.id ?? null,
      }),
    );

    return { ...pageData, items };
  }

  // ---------- Reorder ----------
  async reorderStrategicProjects(
    wrapper: ReorderStrategicProjectWrapperDto,
  ): Promise<StrategicProjectEntity[]> {
    const projectIds = wrapper.items.map((item) => item.id);
    await this.validateExistingIds(projectIds);

    return this.projectRepository.bulkReorderByPlan(
      wrapper.strategicPlanId,
      wrapper.items,
    );
  }

  // ---------- Progress Helpers ----------
  private calculateProjectProgressFromAggregates(
    aggregates: Array<{
      projectFactorId: string;
      totalTasks: number;
      closedTasks: number;
    }>,
  ): number {
    if (!aggregates.length) return 0;

    const factorProgressValues = aggregates.map((agg) => {
      if (agg.totalTasks <= 0) return 0;
      return (agg.closedTasks / agg.totalTasks) * 100;
    });

    const sum = factorProgressValues.reduce((acc, value) => acc + value, 0);
    const average = sum / factorProgressValues.length;

    // Redondeo a dos decimales para consistencia en UI
    return Math.round(average * 100) / 100;
  }

  // ---------- Date Validations ----------
  // Reemplaza tu método actual por este:
  private async validateDatesInsidePlan(
    strategicPlanId: string,
    fromAt: Date,
    untilAt: Date,
  ): Promise<void> {
    const plan = await this.planRepository.findById(strategicPlanId);
    if (!plan) {
      throw new BadRequestException('StrategicPlan not found');
    }

    // Si el plan no tiene rango configurado, no podemos validar contención.
    // (Seguimos validando coherencia local en validateProjectDates)
    if (!plan.fromAt || !plan.untilAt) {
      return;
    }

    const startsBeforePlan = fromAt < plan.fromAt;
    const endsAfterPlan = untilAt > plan.untilAt;

    if (startsBeforePlan || endsAfterPlan) {
      throw new BadRequestException(
        'Project dates must be inside StrategicPlan range (fromAt/untilAt out of bounds)',
      );
    }
  }

  private async validateExistingIds(projectIds: string[]): Promise<void> {
    // Carga mínima para validar existencia; si prefieres eficiencia,
    // puedes cambiar a findMany with count == length.
    const validations = await Promise.all(
      projectIds.map((id) => this.projectRepository.findById(id)),
    );
    const notFoundIndex = validations.findIndex((p) => !p);
    if (notFoundIndex !== -1) {
      throw new NotFoundException(
        `StrategicProject not found: ${projectIds[notFoundIndex]}`,
      );
    }
  }

  private async validateProjectDates(
    fromAt: Date,
    untilAt: Date,
  ): Promise<void> {
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

  async listProjectStructure(dto: ListProjectStructureDto) {
    const rows = await this.projectRepository.fetchStructureByPlan(
      dto.strategicPlanId,
      dto.positionId,
      {
        includeInactiveFactors: false,
        includeInactiveTasks: false,
        includeInactiveParticipants: false, // solo activos por defecto
      },
    );

    const mapped = rows.map((p) => {
      // ---- participantes ----
      const participants = p.participants ?? [];
      const leader =
        participants.find((pp) => pp.isLeader) ?? participants[0] ?? null;

      // ---- factores + tareas + contadores ----
      const factors = (p.factors ?? []).map((f) => {
        const tasks = f.tasks ?? [];
        const taskOpe = tasks.filter((t) => t.status === 'OPE').length;
        const taskClo = tasks.filter((t) => t.status === 'CLO').length;
        return { ...f, taskOpe, taskClo, tasks };
      });

      const progressProject =
        this.computeProjectProgressProjectFromFactors(factors);

      return {
        ...p, // todas las columnas del proyecto
        progressProject, // 0..100
        participants, // participantes del proyecto (solo activos)
        leader, // participante líder (o el primero, o null)
        factors, // factores + contadores + tasks
      };
    });

    if (dto.positionId) {
      return { items: mapped, total: mapped.length };
    }

    // agrupar por positionId del proyecto
    const groupsByPosition: Record<string, any[]> = {};
    for (const proj of mapped) {
      const posId = proj.positionId ?? 'UNASSIGNED';
      if (!groupsByPosition[posId]) groupsByPosition[posId] = [];
      groupsByPosition[posId].push(proj);
    }

    const groups = Object.entries(groupsByPosition).map(
      ([positionId, projects]) => ({
        positionId,
        position: projects[0]?.position ?? null,
        projects,
        total: projects.length,
      }),
    );

    return { groups, totalGroups: groups.length, totalProjects: mapped.length };
  }

  private computeProjectProgressProjectFromFactors(
    factors: Array<{ taskOpe: number; taskClo: number }>,
  ): number {
    if (!factors || factors.length === 0) return 0;
    const perFactor = factors.map((f) => {
      const total = f.taskOpe + f.taskClo;
      return total > 0 ? f.taskClo / total : 0;
    });
    const avg = perFactor.reduce((a, b) => a + b, 0) / perFactor.length;
    return Math.round(avg * 10000) / 100;
  }

  async countOverdueProjectsByPosition(dto: CountOverdueProjectsDto) {
    const at = dto.at ? new Date(dto.at) : new Date();
    const count = await this.projectRepository.countOverdueByPosition(
      dto.positionId,
      at,
    );
    return {
      positionId: dto.positionId,
      at: at.toISOString(),
      count,
    };
  }
}
