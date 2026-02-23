import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import { NotificationService } from 'src/notifications/notifications.service';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';

@Injectable()
export class ObjectiveService {
  constructor(
    private readonly objectiveRepo: ObjectiveRepository,
    private readonly indicatorRepo: IndicatorRepository,
    private readonly objectiveGoalRepo: ObjectiveGoalRepository,
    private readonly objectiveGoalService: ObjectiveGoalService,
    private readonly notificationService: NotificationService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(
    dto: CreateObjectiveDto,
    userId: string,
  ): Promise<ObjectiveEntity> {
    const { indicatorName, baseValue, ...objectiveDto } = dto;

    const input = {
      ...objectiveDto,
      level: dto.level ?? 'OPE',
      valueOrientation: dto.valueOrientation ?? 'CRE',
    };

    // 1) crear objetivo SIN indicatorName
    let objective = await this.objectiveRepo.create(input, userId);

    // --- INICIO NOTIFICACIONES ---
    const notificationScope =
      await this.objectiveRepo.getNotificationScopeByPosition(dto.positionId);

    if (notificationScope?.responsibleUserId) {
      const responsibleUserId = notificationScope.responsibleUserId;
      const isSelfAssignment = userId === responsibleUserId;

      if (!isSelfAssignment) {
        const actorUser = await this.usersRepository.findById(userId);
        const actorName = actorUser
          ? `${actorUser.firstName} ${actorUser.lastName}`.trim()
          : undefined;

        await this.notificationService.emit({
          companyId: notificationScope.companyId,
          businessUnitId: notificationScope.businessUnitId,
          recipientId: responsibleUserId,
          entityType: 'OBJECTIVE', // Asegúrate que este valor exista en el enum NotificationEntity
          entityId: objective.id,
          event: 'ASSIGNED',
          variables: {
            entityLabel: 'Objetivo',
            name: objective.name,
            actorName,
          },
        });
      }
    }
    // --- FIN NOTIFICACIONES ---

    // 2. Crear el indicador asociado
    const indicator = await this.indicatorRepo.create(
      {
        name: dto.indicatorName ?? '',
        isDefault: true,
        isConfigured: false,
        baseValue: baseValue ?? 0, // <--- Aquí asignamos el valor inicial al indicador
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

  findAll(
    strategicPlanId: string,
    positionId: string,
    year?: number,
  ): Promise<ObjectiveEntity[]> {
    return this.objectiveRepo.findAll(strategicPlanId, positionId, year);
  }

  async findAllMixed(
    strategicPlanId: string,
    positionId: string,
    year?: number,
  ) {
    return this.objectiveRepo.findAllMixed(strategicPlanId, positionId, year);
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

    // --- INICIO NOTIFICACIONES (Setup) ---
    const notificationScope =
      await this.objectiveRepo.getNotificationScopeByObjective(dto.objectiveId);
    const responsibleUserId = notificationScope?.responsibleUserId;
    const isSelfUpdate = responsibleUserId
      ? userId === responsibleUserId
      : true;

    // Obtener nombre del actor (quien edita)
    const actorUser = await this.usersRepository.findById(userId);
    const actorName = actorUser
      ? `${actorUser.firstName} ${actorUser.lastName}`.trim()
      : undefined;

    // --- FIN NOTIFICACIONES (Setup) ---

    // ---- helper fecha ----
    const toDate = (d: any) =>
      d instanceof Date ? d : typeof d === 'string' ? new Date(d) : null;

    // Pre-fetch para detectar cambios en thresholds (rangos)
    const existingForThresholds =
      await this.objectiveGoalRepo.findOneActiveByObjectiveId(dto.objectiveId);

    // Extraemos baseValue del INDICADOR (ahora vive ahí)
    const nextBaseValue = dto.indicator?.baseValue ?? dto.objective?.baseValue;
    const currentBaseValue = currentIndicator.baseValue ?? 0;

    // ========== 1) Detectar CAMBIO CRÍTICO (goalValue / baseValue / tendence / measurement) ==========
    const goalValueChanged =
      dto.objective?.goalValue !== undefined
        ? dto.objective.goalValue !== currentObjective.goalValue
        : false;

    const baseValueChanged =
      nextBaseValue !== undefined ? nextBaseValue !== currentBaseValue : false;

    const tendenceChanged =
      dto.indicator?.tendence !== undefined
        ? dto.indicator.tendence !== currentIndicator.tendence
        : false;

    const measurementChanged =
      dto.indicator?.measurement !== undefined
        ? dto.indicator.measurement !== currentIndicator.measurement
        : false;

    // [SEGURIDAD] Validar permiso si cambia la Línea Base
    if (baseValueChanged) {
      const businessUnitId = currentObjective.position?.businessUnitId;
      if (businessUnitId) {
        const hasPermission = await this.objectiveRepo.checkUserPermission(
          userId,
          businessUnitId,
          PERMISSIONS.OBJECTIVE_GOALS.UPDATE_BASE_VALUE,
        );
        if (!hasPermission) {
          throw new ForbiddenException(
            'No tienes permisos para modificar la Línea Base de este objetivo.',
          );
        }
      }
    }

    // ⚠️ periodStart/periodEnd/frequency NO cuentan como críticos (según tu regla)
    const criticalChange = !!(
      goalValueChanged ||
      baseValueChanged ||
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

    // Validar consistencia de Línea Base vs Meta según Tendencia
    const effectiveGoalValue =
      dto.objective?.goalValue !== undefined
        ? dto.objective.goalValue
        : currentObjective.goalValue;

    // Usamos el valor nuevo si viene, sino el actual del indicador
    const effectiveBaseValue =
      nextBaseValue !== undefined ? nextBaseValue : currentBaseValue;

    if (
      typeof effectiveBaseValue === 'number' &&
      typeof effectiveGoalValue === 'number'
    ) {
      if (
        effectiveIndicator.tendence === 'POS' &&
        effectiveBaseValue >= effectiveGoalValue
      ) {
        throw new BadRequestException(
          `En tendencia CRECIENTE, la Meta (${effectiveGoalValue}) debe ser mayor que la Línea Base (${effectiveBaseValue}).`,
        );
      }
      if (
        effectiveIndicator.tendence === 'NEG' &&
        effectiveBaseValue < effectiveGoalValue
      ) {
        throw new BadRequestException(
          `En tendencia DECRECIENTE, la Meta (${effectiveGoalValue}) debe ser menor o igual que la Línea Base (${effectiveBaseValue}).`,
        );
      }
    }

    // ========== 2) Actualizar Objective ==========
    // Nota: dto.objective podría traer 'baseValue' por herencia de DTOs, pero lo ignoramos aquí
    // porque ya lo manejamos en el indicador.
    const {
      baseValue: _ignoredBase,
      indicatorName: _ignoredName,
      ...objectiveData
    } = dto.objective || {};
    const updatedObjective = await this.objectiveRepo.update(
      dto.objectiveId,
      { ...objectiveData, updatedBy: userId },
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
      baseValue: effectiveBaseValue, // <--- Persistimos el baseValue en el indicador
      isConfigured: willConfigureNow ? true : currentIndicator.isConfigured,
      updatedBy: userId,
    };

    await this.indicatorRepo.update(indicatorId, indicatorPayload, userId);

    // ========== 3.1) Resolver thresholds (rangos) para creaciones ==========
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
        effectiveBaseValue ?? null, // <--- Usamos el baseValue efectivo
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
          effectiveBaseValue ?? null, // <--- Usamos el baseValue efectivo
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

    // ========== 5) GESTIÓN DE NOTIFICACIONES (Estrategia: Borrar y Recrear) ==========
    if (responsibleUserId && notificationScope?.companyId) {
      // 5.1) Borrar TODAS las notificaciones de metas pendientes para este objetivo.
      //      Esto es seguro porque usamos el ID del objetivo, que es un UUID válido.
      await this.notificationService.expireForClosed({
        entityType: 'OBJECTIVE_GOAL',
        entityId: updatedObjective.id,
      });

      // 5.2) Recrear notificaciones solo para los meses vigentes.
      //      El método _scheduleNotificationsForGoals se encargará de iterar y
      //      llamar a scheduleInApp, que ya ignora fechas pasadas.
      await this._scheduleNotificationsForGoals(
        normalizedMonths,
        updatedObjective,
        notificationScope,
        userId,
        actorName,
      );
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

    // --- INICIO NOTIFICACIONES (Emisión) ---
    if (responsibleUserId && !isSelfUpdate) {
      await this.notificationService.emit({
        companyId: notificationScope!.companyId,
        businessUnitId: notificationScope!.businessUnitId,
        recipientId: responsibleUserId,
        entityType: 'OBJECTIVE',
        entityId: updatedObjective.id,
        event: 'UPDATED',
        variables: {
          entityLabel: 'Objetivo',
          name: updatedObjective.name,
          actorName,
          // Puedes añadir más contexto sobre qué cambió
          changeDetails: criticalChange
            ? 'Se ha realizado un cambio crítico que regeneró las metas.'
            : 'La configuración del objetivo ha sido actualizada.',
        },
      });
    }
    // --- FIN NOTIFICACIONES (Emisión) ---

    return {
      objective: updatedObjective,
      indicatorUpdated: true,
      goalsRegenerated: criticalChange,
      monthsCount,
    };
  }

  // =================================================================
  // ============== HELPERS PRIVADOS PARA NOTIFICACIONES =============
  // =================================================================

  /**
   * Método privado para programar notificaciones (DUE_SOON, OVERDUE)
   * para una lista de metas mensuales.
   */
  private async _scheduleNotificationsForGoals(
    goals: Array<{ month: number; year: number }>,
    objective: ObjectiveEntity,
    scope: {
      companyId: string | null;
      businessUnitId: string | null;
      responsibleUserId: string | null;
    } | null,
    actorId: string,
    actorName?: string,
  ) {
    // Validación corregida: Aseguramos que todos los IDs necesarios existan.
    if (
      !scope?.responsibleUserId ||
      !scope.companyId ||
      !scope.businessUnitId ||
      !goals.length
    ) {
      return;
    }

    const { responsibleUserId } = scope;

    for (const goal of goals) {
      // La fecha de vencimiento para el cumplimiento es el último día del mes de la meta.
      // El constructor de Date con UTC trata los meses de 0 a 11.
      // Para obtener el último día del mes, se usa el mes siguiente (goal.month) y el día 0.
      const dueDate = new Date(Date.UTC(goal.year, goal.month, 0));

      const baseVariables = {
        entityLabel: 'Objetivo',
        name: objective.name,
        actorId,
        actorName,
        dueDate,
        goalMonth: goal.month,
        goalYear: goal.year,
      };

      // Programar DUE_SOON (-4 y -1 días)
      await this.notificationService.schedule({
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        recipientId: responsibleUserId,
        entityType: 'OBJECTIVE_GOAL',
        entityId: objective.id, // Usamos el ID del objetivo padre
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 4 * 86_400_000),
        variables: baseVariables,
      });
      await this.notificationService.schedule({
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        recipientId: responsibleUserId,
        entityType: 'OBJECTIVE_GOAL',
        entityId: objective.id, // Usamos el ID del objetivo padre
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 1 * 86_400_000),
        variables: baseVariables,
      });

      // Programar OVERDUE (el servicio lo agenda para el día siguiente al dueDate)
      await this.notificationService.schedule({
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        recipientId: responsibleUserId,
        entityType: 'OBJECTIVE_GOAL', // El tipo sigue siendo la meta
        entityId: objective.id, // Usamos el ID del objetivo padre
        event: 'OVERDUE',
        runAt: dueDate,
        variables: baseVariables,
      });
    }
  }

  /**
   * Método privado para expirar notificaciones programadas (DUE_SOON, OVERDUE)
   * para una lista de metas mensuales que fueron eliminadas.
   */
  private async _expireNotificationsForGoals(
    goals: Array<{ month: number; year: number }>,
    objective: ObjectiveEntity,
  ) {
    if (!goals.length) {
      return;
    }

    for (const goal of goals) {
      // Ahora expiramos usando el ID del objetivo y el mes/año en el payload
      await this.notificationService.deleteForClosedByPayload({
        entityType: 'OBJECTIVE_GOAL',
        entityId: objective.id,
        payloadMatch: {
          goalMonth: goal.month,
          goalYear: goal.year,
        },
      });
    }
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

  async inactivate(
    id: string,
    userId: string,
  ): Promise<{
    blocked: boolean;
    message: string;
    associations?: {
      projects: Array<{
        id: string;
        name: string;
        status: string;
        fromAt: Date | null;
        untilAt: Date | null;
        isActive: boolean;
      }>;
      prioritiesByPosition: Array<{
        positionId: string;
        positionName: string;
        priorities: Array<{
          id: string;
          name: string;
          status: string;
          fromAt: Date;
          untilAt: Date;
          isActive: boolean;
        }>;
      }>;
    };
  }> {
    const { projects, priorities } =
      await this.objectiveRepo.findActiveAssociations(id);

    // Agrupación en memoria por posición de la prioridad (puede ser otra posición distinta a la del objetivo)
    const groupsMap = new Map<
      string,
      {
        positionId: string;
        positionName: string;
        priorities: Array<{
          id: string;
          name: string;
          status: string;
          fromAt: Date;
          untilAt: Date;
          isActive: boolean;
        }>;
      }
    >();

    for (const p of priorities) {
      const pid = p.positionId;
      const pname = p.position?.name ?? '(Sin nombre)';
      if (!groupsMap.has(pid)) {
        groupsMap.set(pid, {
          positionId: pid,
          positionName: pname,
          priorities: [],
        });
      }
      groupsMap.get(pid)!.priorities.push({
        id: p.id,
        name: p.name,
        status: p.status,
        fromAt: p.fromAt,
        untilAt: p.untilAt,
        isActive: p.isActive,
      });
    }

    // Orden opcional por nombre de posición para UX estable
    const prioritiesByPosition = Array.from(groupsMap.values()).sort((a, b) =>
      a.positionName.localeCompare(b.positionName),
    );

    if ((projects?.length ?? 0) > 0 || (priorities?.length ?? 0) > 0) {
      // ⚠️ Hay asociaciones → bloqueado (200 OK con detalle)
      return {
        blocked: true,
        message:
          'El objetivo no se inactivó porque tiene asociaciones activas.',
        associations: {
          projects,
          prioritiesByPosition,
        },
      };
    }

    await this.objectiveRepo.inactivate(id, userId);

    return {
      blocked: false,
      message: 'Objetivo inactivado correctamente',
    };
  }
}
