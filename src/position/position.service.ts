import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PositionsRepository } from './repositories/positions.repository';
import { CreatePositionDto, UpdatePositionDto } from './dto';
import { PositionEntity } from './entities/position.entity';
import { PriorityService } from 'src/priority/priority.service';
import { IcoService } from 'src/ico/ico.service';
import { StrategicProjectService } from 'src/strategic-project/strategic-project.service';
import {
  CeoAndSpecialistDto,
  PersonRolePositionDto,
} from './dto/ceo-specialist.dto';

export type OrgNode = {
  idPosition: string;
  namePosition: string | null;
  idUser: string | null;
  nameUser: string | null;
  positionSuperiorId: string | null;
  ico: number;
  icp: number;
  performance: number;
  generalAverageProjects: number;
  numObjectives: number;
  numPriorities: number;
  numProjects: number;
  annualTrend: Array<{
    month: number;
    year: number;
    ico: number;
    icp: number;
    performance: number;
    generalAverageProjects: number;
  }>; // contrato uniforme: vacío aquí
  children: OrgNode[]; // ← estructura jerárquica
};

@Injectable()
export class PositionsService {
  constructor(
    private readonly positionsRepo: PositionsRepository,
    private readonly priorityService: PriorityService,
    private readonly icoService: IcoService,
    private readonly projectService: StrategicProjectService,
  ) {}

  // ===== Helpers locales =====
  private toNumber2(v: any) {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  async create(
    dto: CreatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    return this.positionsRepo.create(dto, userId);
  }

  async findAll(): Promise<PositionEntity[]> {
    return this.positionsRepo.findAll();
  }

  async findAllBybusinessUnitId(
    businessUnitId: string,
  ): Promise<PositionEntity[]> {
    return this.positionsRepo.findAllByBusinessUnitId(businessUnitId);
  }

  async findById(id: string): Promise<PositionEntity> {
    const position = await this.positionsRepo.findById(id);
    if (!position) throw new NotFoundException('Posición no encontrada');
    return position;
  }

  async listByCompanyGroupedByBusinessUnit(companyId: string) {
    return this.positionsRepo.findByCompanyGroupedByBusinessUnit(companyId);
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
    userId: string,
  ): Promise<PositionEntity> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');

    const targetBusinessUnitId = dto.businessUnitId;
    if (dto.isCeo === true) {
      const existingCeo = await this.positionsRepo.findCeoInBusinessUnit(
        targetBusinessUnitId!,
      );
      if (existingCeo && existingCeo.id !== id) {
        throw new ConflictException(
          'Ya existe un CEO en esta unidad de negocio',
        );
      }
    }

    return this.positionsRepo.update(id, dto, userId);
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    userId: string,
  ): Promise<PositionEntity> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');
    return this.positionsRepo.update(id, { isActive } as any, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.positionsRepo.findById(id);
    if (!exists) throw new NotFoundException('Posición no encontrada');
    await this.positionsRepo.remove(id, userId);
  }

  async listOverview(params: {
    companyId: string;
    businessUnitId: string;
    strategicPlanId: string;
    month: number;
    year: number;
    positionId?: string; // ← NUEVO
  }): Promise<{
    listPositions: Array<{
      idPosition: string;
      namePosition: string | null;
      idUser: string | null;
      nameUser: string | null;
      positionSuperiorId: string | null; // ← ya lo estás enviando
      ico: number;
      icp: number;
      performance: number;
      generalAverageProjects: number;
      numObjectives: number;
      numPriorities: number;
      numProjects: number;
      annualTrend: Array<{
        month: number;
        year: number;
        ico: number;
        icp: number;
        performance: number;
        generalAverageProjects: number;
      }>; // ← SIEMPRE presente (vacío o con 12 meses)
    }>;
  }> {
    const {
      companyId,
      businessUnitId,
      strategicPlanId,
      month,
      year,
      positionId,
    } = params;

    // 1) Posiciones por compañía (con userId/userFullName) y filtro por BU
    const raw = await this.listByCompanyGroupedByBusinessUnit(companyId);
    // Tus services no envuelven; toleramos si viniera envuelto igual
    const groups: any[] = Array.isArray(raw) ? raw : [];
    const group = groups.find((g) => g?.businessUnitId === businessUnitId);
    let positions: any[] = Array.isArray(group?.positions)
      ? group.positions
      : [];

    // Si viene positionId, filtrar esa sola posición
    if (positionId) {
      positions = positions.filter((p) => p.id === positionId);
    }

    if (!positions.length) {
      return { listPositions: [] };
    }

    const listPositions = await Promise.all(
      positions.map(async (p) => {
        const idPosition = p.id as string;
        const namePosition = (p.name ?? null) as string | null;
        const idUser = (p.userId ?? null) as string | null;
        const nameUser = (p.userFullName ?? null) as string | null;
        const positionSuperiorId = (p.positionSuperiorId ?? null) as
          | string
          | null;

        // --- ICO (del año para poder “pickear” el mes + contar objetivos)
        const icoResp =
          await this.icoService.listFilteredObjectivesMonthlySeries({
            strategicPlanId,
            positionId: idPosition,
            fromYear: year,
            toYear: year,
          } as any);
        const getIco = (m: number) =>
          Number(
            (
              icoResp?.monthlyAverages?.find(
                (x: any) => x?.month === m && x?.year === year,
              )?.averageIco ?? 0
            ).toFixed(2),
          );
        const numObjectives = Number(icoResp?.listObjectives?.length ?? 0);

        const ico = getIco(month);

        // --- ICP del MES (y total de prioridades ANUAL sumando 12 meses)
        const priMonth = await this.priorityService.list({
          positionId: idPosition,
          month,
          year,
          page: 1,
          limit: 1,
        });
        const icp = Number((priMonth?.icp?.icp ?? 0).toFixed(2));

        let numPriorities = 0;
        for (let m = 1; m <= 12; m++) {
          const priM = await this.priorityService.list({
            positionId: idPosition,
            month: m,
            year,
            page: 1,
            limit: 1,
          });
          numPriorities += Number(priM?.total ?? 0);
        }

        // --- PROYECTOS: dashboard corregido (vigentes IPR) del mes
        const projDash = await this.projectService.getProjectsDashboard(
          { strategicPlanId, positionId: idPosition } as any,
          month,
          year,
        );
        const summary = projDash?.summary ?? projDash?.summary ?? {};
        const generalAverageProjects = Number(
          (summary?.avgCompliance ?? 0).toFixed(2),
        );
        const numProjects = Number(summary?.totalProjects ?? 0);

        // --- PERFORMANCE (ICO × ICP / 100)
        const performance = Number(((ico * icp) / 100).toFixed(2));

        // Si no hay filtro positionId → devolver sin annualTrend
        if (!positionId) {
          return {
            idPosition,
            namePosition,
            idUser,
            nameUser,
            positionSuperiorId, // ← SIEMPRE
            ico,
            icp,
            performance,
            generalAverageProjects,
            numObjectives,
            numPriorities,
            numProjects,
            annualTrend: [],
          };
        }

        // Con filtro positionId → construir annualTrend (ene..dic)
        const annualTrend: Array<{
          month: number;
          year: number;
          ico: number;
          icp: number;
          performance: number;
          generalAverageProjects: number;
        }> = [];

        for (let m = 1; m <= 12; m++) {
          const icoM = getIco(m);

          const priM = await this.priorityService.list({
            positionId: idPosition,
            month: m,
            year,
            page: 1,
            limit: 1,
          });
          const icpM = Number((priM?.icp?.icp ?? 0).toFixed(2));

          const projM = await this.projectService.getProjectsDashboard(
            { strategicPlanId, positionId: idPosition } as any,
            m,
            year,
          );
          const sumM = projM?.summary ?? projM?.summary ?? {};
          const avgProjM = Number((sumM?.avgCompliance ?? 0).toFixed(2));

          const perfM = Number(((icoM * icpM) / 100).toFixed(2));

          annualTrend.push({
            month: m,
            year,
            ico: icoM,
            icp: icpM,
            performance: perfM,
            generalAverageProjects: avgProjM,
          });
        }

        return {
          idPosition,
          namePosition,
          idUser,
          nameUser,
          positionSuperiorId, // ← SIEMPRE
          ico,
          icp,
          performance,
          generalAverageProjects,
          numObjectives,
          numPriorities,
          numProjects,
          annualTrend, // ← SOLO cuando llega positionId
        };
      }),
    );

    return { listPositions };
  }

  async getOrgChartOverview(params: {
    companyId: string;
    businessUnitId: string;
    strategicPlanId: string;
    month: number;
    year: number;
    positionId?: string; // ← NUEVO (opcional)
  }): Promise<{
    root: OrgNode | null;
    orphans: OrgNode[];
  }> {
    const {
      companyId,
      businessUnitId,
      strategicPlanId,
      month,
      year,
      positionId,
    } = params;

    // 1) Reutilizamos overview para obtener TODAS las posiciones con métricas
    const { listPositions } = await this.listOverview({
      companyId,
      businessUnitId,
      strategicPlanId,
      month,
      year,
    });

    // 2) Indexar y preparar nodos
    const byId = new Map<string, OrgNode>();
    for (const p of listPositions) {
      byId.set(p.idPosition, {
        ...p,
        children: [],
        annualTrend: p.annualTrend ?? [],
      });
    }

    // 3) Enlazar por positionSuperiorId
    const all = Array.from(byId.values());
    for (const n of all) {
      const sup = n.positionSuperiorId;
      if (sup && byId.has(sup)) {
        byId.get(sup)!.children.push(n);
      }
    }

    // === NUEVO: si llega positionId → devolver SOLO sus hijos ===
    if (positionId) {
      const target = byId.get(positionId);
      if (!target) {
        return { root: null, orphans: [] };
      }
      // “Solo hijos”: devolvemos un nodo raíz virtual con los hijos del target.
      // (Contrato intacto: el front puede usar root.children directamente.)
      const virtualRoot: OrgNode = {
        // metadata básica del target (por si el front quiere mostrar cabeza local)
        ...target,
        // pero lo importante: sus hijos
        children: target.children,
      };
      return { root: virtualRoot, orphans: [] };
    }

    // 4) Caso normal: organigrama completo con CEO como cabeza
    const ceo = await this.positionsRepo
      .findCeoInBusinessUnit(businessUnitId)
      .catch(() => null);
    const ceoId = ceo?.id ?? null;

    let root: OrgNode | null = (ceoId && byId.get(ceoId)) || null;
    const orphans: OrgNode[] = [];

    if (!root) {
      // Si no hay CEO, intenta inferir raíz única sin superior
      const candidates = all.filter((n) => !n.positionSuperiorId);
      if (candidates.length === 1) {
        root = candidates[0];
      } else {
        // si hay varias “raíces” o ninguna clara, todo va a orphans
        return { root: null, orphans: all };
      }
    }

    // Orphans = nodos que no cuelgan (superior fuera del set)
    for (const n of all) {
      if (n === root) continue;
      const sup = n.positionSuperiorId;
      if (sup && !byId.has(sup)) {
        orphans.push(n);
      }
    }

    return { root, orphans };
  }

  async getCeoAndSpecialist(
    companyId: string,
    businessUnitId: string,
  ): Promise<CeoAndSpecialistDto> {
    // Llama al método nuevo del repo (que ya definimos antes)
    return this.positionsRepo.findCeoAndSpecialistByCompanyAndBU(
      companyId,
      businessUnitId,
    );
  }

  async getPersonByCompanyBUAndPosition(
    companyId: string,
    businessUnitId: string,
    positionId: string,
  ): Promise<PersonRolePositionDto> {
    return this.positionsRepo.findUserRolePositionByCompanyBUPosition(
      companyId,
      businessUnitId,
      positionId,
    );
  }
}
