import { Injectable, NotFoundException } from '@nestjs/common';
import { ObjectiveGoalRepository } from './repositories/objective-goal.repository';
import { CreateObjectiveGoalDto, UpdateObjectiveGoalDto } from './dto';
import { ObjectiveGoalEntity } from './entities/objective-goal.entity';
import { computeGoalMetrics } from './utils/goal-math';

@Injectable()
export class ObjectiveGoalService {
  constructor(private readonly goalRepo: ObjectiveGoalRepository) {}

  async create(
    dto: CreateObjectiveGoalDto,
    userId: string,
  ): Promise<ObjectiveGoalEntity> {
    return this.goalRepo.create(dto, userId);
  }

  async createMany(
    dtos: CreateObjectiveGoalDto[],
    userId: string,
  ): Promise<ObjectiveGoalEntity[]> {
    return this.goalRepo.createMany(dtos, userId);
  }

  async findById(id: string): Promise<ObjectiveGoalEntity | null> {
    return this.goalRepo.findById(id);
  }

  async update(id: string, dto: UpdateObjectiveGoalDto, userId: string) {
    // 0) Cargar estado actual completo
    const current = await this.goalRepo.findByIdWithObjectiveAndIndicator(id);
    if (!current || !current.isActive)
      throw new NotFoundException('ObjectiveGoal no encontrado');

    const indicator = current.objective?.indicator;
    if (!indicator)
      throw new NotFoundException('Indicator del Objetivo no encontrado');

    // 1) Preparar “siguientes” valores mezclando payload + actual
    const nextGoalValue = dto.goalValue ?? current.goalValue ?? 0;
    const nextRealValue = dto.realValue ?? current.realValue ?? 0;
    const nextR1 = dto.rangeExceptional ?? current.rangeExceptional ?? null;
    const nextR2 = dto.rangeInacceptable ?? current.rangeInacceptable ?? null;

    // 2) Cálculo (idéntico al legado: indexCompliance = realPercentage; semáforo solo si llega realValue)
    const shouldRecalcLight =
      'realValue' in dto ||
      'rangeExceptional' in dto ||
      'rangeInacceptable' in dto;

    const { realPercentage, indexCompliance, lightNumeric, action } =
      computeGoalMetrics({
        tendence: indicator.tendence as any,
        measurement: indicator.measurement as any,
        goalValue: nextGoalValue,
        realValue: nextRealValue,
        rangeExceptional: nextR1,
        rangeInacceptable: nextR2,
        month: current.month,
        year: current.year,
        shouldRecalcLight,
      });

    // 3) Datos a persistir (mantén otros campos del DTO tal cual)
    const dataToUpdate = {
      goalValue: dto.goalValue ?? current.goalValue,
      goalPercentage: dto.goalPercentage ?? current.goalPercentage,
      realValue: dto.realValue ?? current.realValue,
      realPercentage,
      indexCompliance,
      score: dto.score ?? current.score,
      rangeExceptional: nextR1,
      rangeInacceptable: nextR2,
      indexPerformance: dto.indexPerformance ?? current.indexPerformance,
      baseValue: dto.baseValue ?? current.baseValue,

      // light ahora es numérico (Float en tu tabla)
      light: shouldRecalcLight ? lightNumeric : current.light,

      observation: dto.observation ?? current.observation,
      action: shouldRecalcLight ? action : current.action,
    } as any;

    // 4) Transacción: update + snapshot en historial
    const updated = await this.goalRepo.runInTransaction(async (tx) => {
      const u = await this.goalRepo.updateComputed(
        id,
        dataToUpdate,
        userId,
        tx,
      );
      await this.goalRepo.insertHistoryFromGoal(u, userId, tx);
      return u;
    });

    return updated; // o envolver en tu Response DTO si prefieres
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.goalRepo.remove(id, userId);
  }
}
