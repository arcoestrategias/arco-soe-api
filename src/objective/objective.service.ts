import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  ReorderObjectiveWrapperDto,
  ConfigureObjectiveDto,
} from './dto';
import { ObjectiveRepository } from './repositories/objective.repository';
import { ObjectiveEntity } from './entities/objective.entity';
import { IndicatorRepository } from 'src/indicator/repositories/indicator.repository';
import { ObjectiveGoalRepository } from 'src/objective-goal/repositories/objective-goal.repository';
import { ResponseObjectiveWithIndicatorDto } from './dto/response-objective-with-indicator.dto';
import { ObjectiveGoalService } from 'src/objective-goal/objective-goal.service';

@Injectable()
export class ObjectiveService {
  constructor(
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly indicatorRepo: IndicatorRepository,
    private readonly objectiveGoalRepo: ObjectiveGoalRepository,
    private readonly objectiveGoalService: ObjectiveGoalService,
  ) {}

  async create(
    dto: CreateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    const { indicatorName, ...objectiveDto } = dto;

    const input = {
      ...objectiveDto,
      level: dto.level ?? 'OPE',
      valueOrientation: dto.valueOrientation ?? 'CRE',
    };

    // 1) crear objetivo SIN indicatorName
    const objective = await this.objectiveRepo.create(input, userId);

    // 2. Crear el indicador asociado
    const indicator = await this.indicatorRepo.create(
      {
        name: dto.indicatorName ?? '',
        isDefault: true,
        isConfigured: false,
      },
      userId,
    );

    // 3. Asociar el indicador al objetivo
    return this.objectiveRepo.update(
      objective.id,
      {
        indicatorId: indicator.id,
      },
      userId,
    );
  }

  async findAll(
    strategicPlanId: string,
    positionId: string,
  ): Promise<ObjectiveEntity[]> {
    return this.objectiveRepo.findAll(strategicPlanId, positionId);
  }

  async findById(id: string): Promise<ObjectiveEntity> {
    const objective = await this.objectiveRepo.findById(id);
    if (!objective) {
      throw new NotFoundException('Objetivo no encontrado');
    }
    return objective;
  }

  async update(
    id: string,
    dto: UpdateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    return this.objectiveRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.objectiveRepo.remove(id, userId);
  }

  async reorder(
    dto: ReorderObjectiveWrapperDto,
    userId: string,
  ): Promise<void> {
    await this.objectiveRepo.reorder(dto.items, userId, dto.strategicPlanId);
  }

  /**
   * Configura un objetivo + indicador y (si corresponde) regenera ObjectiveGoals.
   * Reglas de cambio crítico: cambia goalValue (Objective) o tendence/measurement (Indicator).
   */
  async configureObjective(dto: ConfigureObjectiveDto, userId: string) {
    const currentObjective = await this.objectiveRepo.findForConfigure(
      dto.objectiveId,
    );
    if (!currentObjective)
      throw new NotFoundException('Objetivo no encontrado');

    const currentIndicator = await this.indicatorRepo.findById(
      currentObjective.indicatorId!!,
    );
    if (!currentIndicator)
      throw new NotFoundException('Indicador para el objetivo no encontrado');

    // ---- helper fecha ----
    const toDate = (d: any) =>
      d instanceof Date ? d : typeof d === 'string' ? new Date(d) : null;

    // ========== 1) Detectar CAMBIO CRÍTICO (solo goalValue / tendence / measurement) ==========
    const goalValueChanged =
      dto.objective?.goalValue !== undefined
        ? dto.objective.goalValue !== currentObjective.goalValue
        : false;

    const tendenceChanged =
      dto.indicator?.tendence !== undefined
        ? dto.indicator.tendence !== currentIndicator.tendence
        : false;

    const measurementChanged =
      dto.indicator?.measurement !== undefined
        ? dto.indicator.measurement !== currentIndicator.measurement
        : false;

    // ⚠️ periodStart/periodEnd/frequency NO cuentan como críticos (según tu regla)
    const criticalChange = !!(
      goalValueChanged ||
      tendenceChanged ||
      measurementChanged
    );

    // ========== 1.1) Validar umbrales si vienen ambos ==========
    if (dto.rangeExceptional != null && dto.rangeInacceptable != null) {
      if (dto.rangeInacceptable > dto.rangeExceptional) {
        throw new BadRequestException(
          'rangeInacceptable no puede ser mayor que rangeExceptional.',
        );
      }
    }

    // ========== 1.2) Construir estado EFECTIVO del indicador (merge dto + actual) ==========
    const i = dto.indicator ?? {};
    const effectiveIndicator = {
      tendence: i.tendence ?? currentIndicator.tendence,
      measurement: i.measurement ?? currentIndicator.measurement,
      frequency: i.frequency ?? currentIndicator.frequency,
      type: i.type ?? currentIndicator.type,
      periodStart: toDate(i.periodStart ?? currentIndicator.periodStart),
      periodEnd: toDate(i.periodEnd ?? currentIndicator.periodEnd),
    };

    // ========== 1.3) Validar/normalizar months (si vienen) contra frecuencia/período EFECTIVOS ==========
    let monthsCount = 0;
    let normalizedMonths: Array<{ month: number; year: number }> = [];

    // En cambio crítico, months es obligatorio
    if (criticalChange && (!dto.months || dto.months.length === 0)) {
      throw new BadRequestException(
        'Debe enviar "months" para regenerar objetivos en un cambio crítico.',
      );
    }

    if (dto.months && dto.months.length) {
      normalizedMonths = this.normalizeAndValidateMonths(
        effectiveIndicator.frequency as any,
        effectiveIndicator.periodStart as Date,
        effectiveIndicator.periodEnd as Date,
        dto.months,
      );
    }

    // ========== 2) Actualizar Objective ==========
    const updatedObjective = await this.objectiveRepo.update(
      dto.objectiveId,
      { ...dto.objective, updatedBy: userId },
      userId,
    );

    // ========== 3) Actualizar Indicator ==========
    const indicatorId = dto.indicatorId ?? currentIndicator.id;

    // Por tu regla: isConfigured SOLO cambia a true si llegaron months[]
    const willConfigureNow = !!normalizedMonths.length;

    const indicatorPayload: any = {
      ...dto.indicator, // solo escribe lo que vino
      // aseguramos que se persistan las fechas efectivas parseadas si vinieron
      periodStart:
        i.periodStart !== undefined
          ? effectiveIndicator.periodStart
          : currentIndicator.periodStart,
      periodEnd:
        i.periodEnd !== undefined
          ? effectiveIndicator.periodEnd
          : currentIndicator.periodEnd,
      isConfigured: willConfigureNow ? true : currentIndicator.isConfigured,
      updatedBy: userId,
    };

    await this.indicatorRepo.update(indicatorId, indicatorPayload, userId);

    // ========== 3.1) Resolver thresholds (rangos) para creaciones ==========
    const existingForThresholds =
      await this.objectiveGoalRepo.findOneActiveByObjectiveId(dto.objectiveId);
    const resolvedThresholds = {
      rangeExceptional:
        dto.rangeExceptional ?? existingForThresholds?.rangeExceptional ?? null,
      rangeInacceptable:
        dto.rangeInacceptable ??
        existingForThresholds?.rangeInacceptable ??
        null,
    };

    // ========== 4) Metas: regeneración (solo si crítico) o SYNC parcial ==========
    if (criticalChange && normalizedMonths.length) {
      // Regeneración total (por cambio crítico)
      await this.objectiveGoalRepo.archiveAndReplaceGoals(
        dto.objectiveId,
        normalizedMonths,
        updatedObjective.goalValue ?? null,
        userId,
        resolvedThresholds,
      );
      monthsCount = normalizedMonths.length;
    } else if (!criticalChange && normalizedMonths.length) {
      // SYNC PARCIAL: mantener EXACTAMENTE los months enviados (agrega nuevos y elimina sobrantes)
      const currentActive =
        await this.objectiveGoalRepo.findActiveMonthYearList(dto.objectiveId);
      const key = (m: number, y: number) => `${y}-${m}`;
      const desiredSet = new Set(
        normalizedMonths.map((m) => key(m.month, m.year)),
      );
      const currentSet = new Set(
        currentActive.map((m) => key(m.month, m.year)),
      );

      const toAdd = normalizedMonths.filter(
        (m) => !currentSet.has(key(m.month, m.year)),
      );
      const toRemove = currentActive.filter(
        (m) => !desiredSet.has(key(m.month, m.year)),
      );

      if (toAdd.length) {
        await this.objectiveGoalRepo.createManyIfNotExists(
          dto.objectiveId,
          toAdd,
          updatedObjective.goalValue ?? null,
          userId,
          resolvedThresholds,
        );
      }

      if (toRemove.length) {
        await this.objectiveGoalRepo.archiveAndDeleteByMonths(
          dto.objectiveId,
          toRemove,
          userId,
        );
      }

      monthsCount = normalizedMonths.length; // procesados en esta sync
    }

    // ----- 5) Si llegaron rangos, actualizarlos en cada goal y recalcular 'light' -----
    const hasRanges = 'rangeExceptional' in dto || 'rangeInacceptable' in dto;
    if (hasRanges) {
      // Si enviaste months en esta llamada, aplicamos sobre ellos (después de regenerar/sync)
      // Si NO enviaste months, puedes decidir: aplicar a TODOS los activos del objetivo.
      const targetMonths = normalizedMonths.length
        ? normalizedMonths
        : await this.objectiveGoalRepo.findActiveMonthYearList(dto.objectiveId);

      const goalIds =
        await this.objectiveGoalRepo.findActiveIdsByObjectiveAndMonths(
          dto.objectiveId,
          targetMonths,
        );

      // Bulk en transacción por seguridad
      await this.objectiveGoalRepo.runInTransaction(async (tx) => {
        for (const goalId of goalIds) {
          // Usamos el service.update para que:
          //  - mezcle estado actual + payload
          //  - recalcule métricas con computeGoalMetrics
          //  - inserte historia
          await this.objectiveGoalService.update(
            goalId,
            {
              rangeExceptional: dto.rangeExceptional ?? undefined,
              rangeInacceptable: dto.rangeInacceptable ?? undefined,
              // TIP: si quieres forzar recálculo de 'light' sí o sí,
              // puedes agregar un flag 'force' y manejarlo, pero con el cambio (1) ya recalcula por rangos.
            } as any,
            userId,
          );
        }
      });
    }

    return {
      objective: updatedObjective,
      indicatorUpdated: true,
      goalsRegenerated: criticalChange,
      monthsCount,
    };
  }

  private normalizeAndValidateMonths(
    frequency: 'MES' | 'TRI' | 'QTR' | 'STR' | 'ANU' | 'PER',
    periodStart: Date | null | undefined,
    periodEnd: Date | null | undefined,
    months: Array<{ month: number; year: number }>,
  ): Array<{ month: number; year: number }> {
    if (!Array.isArray(months) || months.length === 0) {
      throw new BadRequestException('Debe enviar al menos un mes en "months".');
    }

    // Dedupe + sort
    const key = (m: number, y: number) => y * 12 + (m - 1);
    const uniqueMap = new Map<number, { month: number; year: number }>();
    for (const it of months) {
      if (!it || typeof it.month !== 'number' || typeof it.year !== 'number') {
        throw new BadRequestException('Formato inválido en "months".');
      }
      if (it.month < 1 || it.month > 12) {
        throw new BadRequestException('Mes fuera de rango en "months".');
      }
      uniqueMap.set(key(it.month, it.year), { month: it.month, year: it.year });
    }
    const normalized = Array.from(uniqueMap.values()).sort(
      (a, b) => key(a.month, a.year) - key(b.month, b.year),
    );

    // Personalizado: no validamos progresión, solo devolvemos normalizado
    if (frequency === 'PER') return normalized;

    // Para el resto de frecuencias, validamos pertenencia al rango/progresión
    if (!(periodStart instanceof Date) || isNaN(+periodStart)) {
      throw new BadRequestException(
        'indicator.periodStart inválido o ausente.',
      );
    }
    if (!(periodEnd instanceof Date) || isNaN(+periodEnd)) {
      throw new BadRequestException('indicator.periodEnd inválido o ausente.');
    }

    const start = new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1),
    );
    if (start > end) {
      throw new BadRequestException(
        'indicator.periodStart no puede ser mayor que indicator.periodEnd.',
      );
    }

    const stepByFreq: Record<string, number> = {
      MES: 1,
      TRI: 3,
      QTR: 4,
      STR: 6,
      ANU: 12,
    };
    const step = stepByFreq[frequency] ?? 1;

    const startIdx = start.getUTCFullYear() * 12 + start.getUTCMonth();
    const endIdx = end.getUTCFullYear() * 12 + end.getUTCMonth();

    const invalid = normalized.filter(({ month, year }) => {
      const idx = year * 12 + (month - 1);
      // dentro del rango y alineado con el paso desde el inicio
      const inRange = idx >= startIdx && idx <= endIdx;
      const aligned = (idx - startIdx) % step === 0;
      return !(inRange && aligned);
    });

    if (invalid.length) {
      throw new BadRequestException(
        `Algunos meses no son válidos para la frecuencia ${frequency} y rango indicado: ${JSON.stringify(invalid)}`,
      );
    }

    return normalized;
  }

  async findUnconfiguredByPlanAndPosition(
    strategicPlanId: string,
    positionId: string,
  ): Promise<ResponseObjectiveWithIndicatorDto[]> {
    const rows = await this.objectiveRepo.findUnconfiguredByPlanAndPosition({
      strategicPlanId,
      positionId,
    });

    return rows.map((r) => new ResponseObjectiveWithIndicatorDto(r));
  }
}
