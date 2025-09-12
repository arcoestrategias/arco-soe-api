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
import { ListStrategicProjectsByPlanAndPositionDto } from './dto/list-by-plan-and-position.dto';

@Injectable()
export class StrategicProjectService {
  constructor(
    private readonly projectRepository: StrategicProjectRepository,
    private readonly planRepository: StrategicPlanRepository,
    private readonly projectFactorRepository: ProjectFactorRepository,
    private readonly projectParticipantRepository: ProjectParticipantRepository,
  ) {}

  private resolveMonthYear(month?: number, year?: number) {
    const now = new Date();
    const m = month && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const y = year && year > 0 ? year : now.getFullYear();
    return { month: m, year: y };
  }

  private monthRange(year: number, month: number) {
    // trabajamos en UTC para evitar desfases
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    return { start, end };
  }

  private overlapsMonth(
    fromAt?: Date | string | null,
    untilAt?: Date | string | null,
    start?: Date,
    end?: Date,
  ) {
    if (!fromAt || !untilAt || !start || !end) return false;
    const f = new Date(fromAt);
    const u = new Date(untilAt);
    return f <= end && u >= start;
  }

  // ---------- Create ----------
  async createStrategicProject(
    dto: CreateStrategicProjectDto,
    userId: string,
  ): Promise<StrategicProjectEntity> {
    // 1) Traer el plan
    const plan = await this.planRepository.findById(dto.strategicPlanId);
    if (!plan) throw new NotFoundException('Strategic plan not found');

    // 2) Resolver fechas efectivas
    const effectiveFromAt = dto.fromAt ?? plan.fromAt;
    const effectiveUntilAt = dto.untilAt ?? plan.untilAt;

    if (!effectiveFromAt || !effectiveUntilAt) {
      // Solo por seguridad si en DB son NOT NULL
      throw new BadRequestException(
        'No se pudo resolver el rango de fechas del proyecto',
      );
    }

    // Validaciones de fechas
    await this.validateProjectDates(effectiveFromAt, effectiveUntilAt);
    await this.validateDatesInsidePlan(
      dto.strategicPlanId,
      effectiveFromAt,
      effectiveUntilAt,
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
      fromAt: effectiveFromAt,
      untilAt: effectiveUntilAt,
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

  async getProjectStructure(opts: {
    projectId: string;
    includeInactiveFactors?: boolean;
    includeInactiveTasks?: boolean;
    includeInactiveParticipants?: boolean;
  }) {
    const p = await this.projectRepository.getStructureByProject(opts);

    // participantes
    const participants = p.participants ?? [];
    const leader =
      participants.find((pp) => pp.isLeader) ?? participants[0] ?? null;

    // factores + tareas + contadores
    const factors = (p.factors ?? []).map((f) => {
      const tasks = f.tasks ?? [];
      const taskOpe = tasks.filter((t) => t.status === 'OPE').length;
      const taskClo = tasks.filter((t) => t.status === 'CLO').length;
      return { ...f, taskOpe, taskClo, tasks };
    });

    const progressProject =
      this.computeProjectProgressProjectFromFactors(factors);

    return {
      project: {
        ...p,
        // asegurar objetivo disponible
        objective: p.objective
          ? { id: p.objective.id, name: p.objective.name }
          : null,
        participants,
        leader,
        factors,
        progressProject,
      },
    };
  }

  async getProjectsDashboard(
    dto: ListProjectStructureDto,
    month?: number,
    year?: number,
  ) {
    // 1) Traer estructura igual que antes
    const data = await this.listProjectStructure(dto);
    const items = dto.positionId
      ? (data.items ?? [])
      : Object.values(data.groups ?? {}).flat();

    // 2) Resolver mes/año (opcional) y armar rango
    const { month: m, year: y } = this.resolveMonthYear(month, year);
    const { start, end } = this.monthRange(y, m);

    // 3) Mapeo "projects" (igual que antes, para no romper front):
    const projects = items.map((p: any) => {
      const factors = p.factors ?? [];
      const allTasks = factors.flatMap((f: any) => f.tasks ?? []);
      const tasksClosed = allTasks.filter(
        (t: any) => t.status === 'CLO',
      ).length;
      const tasksTotal = allTasks.length;

      const executed = allTasks
        .filter((t: any) => t.status === 'CLO')
        .reduce((sum: number, t: any) => sum + Number(t.budget ?? 0), 0);

      return {
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        fromAt: p.fromAt ? new Date(p.fromAt).toISOString() : null,
        untilAt: p.untilAt ? new Date(p.untilAt).toISOString() : null,
        budget: Number(p.budget ?? 0),
        executed,
        tasksClosed,
        tasksTotal,
        compliance: Number(p.progressProject ?? 0), // ya calculado
        objectiveId: p.objective?.id ?? p.objectiveId ?? null,
        objectiveName: p.objective?.name ?? null,
        factorsTotal: factors.length,
        status: p.status ?? null,
      };
    });

    // 4) KPIs base (sin cambiar la semántica actual)
    const totalProjects = projects.length;
    const totalBudget = projects.reduce((a, x) => a + (x.budget ?? 0), 0);
    const totalExecuted = projects.reduce((a, x) => a + (x.executed ?? 0), 0);

    // 5) NUEVO: avgCompliance SOLO con proyectos VIGENTES
    //    Vigente ≡ status === 'IPR' y solapa con el mes (fromAt..untilAt)
    const vigentes = items.filter(
      (p: any) =>
        p.status === 'IPR' &&
        this.overlapsMonth(p.fromAt, p.untilAt, start, end),
    );

    const avgCompliance = vigentes.length
      ? +(
          vigentes.reduce(
            (acc: number, p: any) => acc + Number(p.progressProject ?? 0),
            0,
          ) / vigentes.length
        ).toFixed(2)
      : 0;

    return {
      summary: { totalProjects, avgCompliance, totalBudget, totalExecuted },
      projects,
    };
  }

  async listByPlanAndPosition(
    dto: ListStrategicProjectsByPlanAndPositionDto,
  ): Promise<StrategicProjectEntity[]> {
    const { strategicPlanId, positionId } = dto;
    if (!strategicPlanId || !positionId) {
      throw new BadRequestException(
        'strategicPlanId y positionId son obligatorios',
      );
    }
    const rows = await this.projectRepository.findByPlanAndPosition(
      strategicPlanId,
      positionId,
    );
    return rows; // si usas Entities/DTOs de respuesta, mapéalos aquí
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

      const objective = p.objective
        ? { id: p.objective.id, name: p.objective.name }
        : null;

      return {
        ...p, // todas las columnas del proyecto
        objective,
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
