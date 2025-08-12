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

@Injectable()
export class ObjectiveService {
  constructor(
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly indicatorRepo: IndicatorRepository,
    private readonly objectiveGoalRepo: ObjectiveGoalRepository,
  ) {}

  async create(
    dto: CreateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    const input = {
      ...dto,
      level: dto.level ?? 'OPE',
      valueOrientation: dto.valueOrientation ?? 'CRE',
    };

    // 1. Crear el objetivo

    const objective = await this.objectiveRepo.create(input, userId);

    // 2. Crear el indicador asociado
    const indicator = await this.indicatorRepo.create(
      {
        name: `${objective.name}`,
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

  async findAll(strategicPlanId: string): Promise<ObjectiveEntity[]> {
    return this.objectiveRepo.findAll(strategicPlanId);
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

    // 1) Detectar cambios críticos
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

    const criticalChange = !!(
      goalValueChanged ||
      tendenceChanged ||
      measurementChanged
    );

    // 1.1) Validar umbrales si vienen ambos
    if (dto.rangeExceptional != null && dto.rangeInacceptable != null) {
      if (dto.rangeInacceptable > dto.rangeExceptional) {
        throw new BadRequestException(
          'rangeInacceptable no puede ser mayor que rangeExceptional.',
        );
      }
    }

    // 1.2) Validar/normalizar months ANTES de cualquier escritura (PER no exige progresión)
    let monthsCount = 0;
    let normalizedMonths: Array<{ month: number; year: number }> = [];

    // Si hay cambio crítico, se requieren months para regenerar
    if (criticalChange && (!dto.months || dto.months.length === 0)) {
      throw new BadRequestException(
        'Debe enviar "months" para regenerar objetivos en un cambio crítico.',
      );
    }

    if (dto.months && dto.months.length) {
      const frequency = (dto.indicator?.frequency ??
        currentIndicator.frequency) as any;
      const periodStart = (dto.indicator?.periodStart ??
        currentIndicator.periodStart) as Date | null | undefined;
      const periodEnd = (dto.indicator?.periodEnd ??
        currentIndicator.periodEnd) as Date | null | undefined;

      normalizedMonths = this.normalizeAndValidateMonths(
        frequency,
        periodStart,
        periodEnd,
        dto.months,
      );
    }

    // 2) Actualizar Objective
    const updatedObjective = await this.objectiveRepo.update(
      dto.objectiveId,
      { ...dto.objective, updatedBy: userId },
      userId,
    );

    // 3) Actualizar Indicator
    const indicatorId = dto.indicatorId ?? currentIndicator.id;
    const i = dto.indicator ?? {};
    const isFullyConfig =
      i.tendence !== undefined &&
      i.measurement !== undefined &&
      i.frequency !== undefined &&
      i.type !== undefined &&
      i.periodStart instanceof Date &&
      i.periodEnd instanceof Date;

    const indicatorPayload = {
      ...dto.indicator,
      isConfigured: isFullyConfig ? true : currentIndicator.isConfigured,
      updatedBy: userId,
    };

    await this.indicatorRepo.update(
      indicatorId,
      indicatorPayload as any,
      userId,
    );

    const existingForThresholds =
      await this.objectiveGoalRepo.findOneActiveByObjectiveId(dto.objectiveId);

    // Resolve thresholds to use on creation
    const resolvedThresholds = {
      rangeExceptional:
        dto.rangeExceptional ?? existingForThresholds?.rangeExceptional ?? null,
      rangeInacceptable:
        dto.rangeInacceptable ??
        existingForThresholds?.rangeInacceptable ??
        null,
    };

    // 4) Validar/normalizar months SIEMPRE que vengan (PER no exige progresión) — ya validado arriba
    if (criticalChange && normalizedMonths.length) {
      // Regeneración total (ya lo tenías así)
      await this.objectiveGoalRepo.archiveAndReplaceGoals(
        dto.objectiveId,
        normalizedMonths,
        updatedObjective.goalValue ?? null,
        userId,
        resolvedThresholds,
      );
      monthsCount = normalizedMonths.length;
    } else if (!criticalChange && normalizedMonths.length) {
      // === SYNC PARCIAL: mantener solo los enviados ===
      // 1) Calcular diferencias
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

      // 2) Agregar los nuevos faltantes
      if (toAdd.length) {
        await this.objectiveGoalRepo.createManyIfNotExists(
          dto.objectiveId,
          toAdd,
          updatedObjective.goalValue ?? null,
          userId,
          resolvedThresholds,
        );
      }

      // 3) Archivar + eliminar los que sobran
      if (toRemove.length) {
        await this.objectiveGoalRepo.archiveAndDeleteByMonths(
          dto.objectiveId,
          toRemove,
          userId,
        );
      }
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
}
