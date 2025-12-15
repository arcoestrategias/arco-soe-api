import { Injectable } from '@nestjs/common';
import { MeetingFrequency } from '@prisma/client';
import {
  addWeeks,
  addMonths,
  addDays,
  endOfDay,
  setDay,
  setDate,
  isAfter,
  differenceInMilliseconds,
} from 'date-fns';

interface RecurrenceConfig {
  frequency: MeetingFrequency;
  startDate: Date;
  endDate: Date;
  seriesEndDate?: Date;
  dayValue?: number;
  daysOfWeek?: number[];
}

@Injectable()
export class RecurrenceService {
  generateOccurrences(
    config: RecurrenceConfig,
    horizon: Date,
  ): { startDate: Date; endDate: Date }[] {
    const {
      frequency,
      startDate,
      endDate,
      seriesEndDate,
      dayValue,
      daysOfWeek,
    } = config;

    // CORRECCIÓN: Asegurar que la fecha fin de serie incluya todo el día (23:59:59)
    // para evitar que se corte la última ocurrencia si la hora de la reunión es posterior a 00:00.
    const effectiveSeriesEndDate = seriesEndDate
      ? endOfDay(seriesEndDate)
      : undefined;

    const finalEndDate =
      effectiveSeriesEndDate && isAfter(horizon, effectiveSeriesEndDate)
        ? effectiveSeriesEndDate
        : horizon;
    const duration = differenceInMilliseconds(endDate, startDate);

    const occurrences: { startDate: Date; endDate: Date }[] = [];
    let currentStartDate = startDate;

    // Lógica especial para SEMANAL con MÚLTIPLES DÍAS (ej: Lun, Mie, Vie)
    if (
      frequency === MeetingFrequency.WEEKLY &&
      daysOfWeek &&
      daysOfWeek.length > 0
    ) {
      // Ordenamos los días para procesarlos en orden
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      let currentWeekDate = startDate;

      // FIX: Usar el inicio de la semana para la condición del bucle.
      while (true) {
        const weekStart = setDay(currentWeekDate, 1, { weekStartsOn: 1 });
        if (isAfter(weekStart, finalEndDate)) break;

        for (const dayIndex of sortedDays) {
          // Calculamos la fecha para ese día específico en la semana actual
          const occurrenceStart = setDay(currentWeekDate, dayIndex, {
            weekStartsOn: 1,
          });

          // Validaciones de rango
          if (isAfter(occurrenceStart, finalEndDate)) continue;

          // Evitar generar ocurrencias anteriores a la fecha de inicio original
          // (ej: Si empieza el Miércoles y pides Lunes, el Lunes de esa semana ya pasó)
          if (isAfter(startDate, occurrenceStart)) continue;

          occurrences.push({
            startDate: occurrenceStart,
            endDate: new Date(occurrenceStart.getTime() + duration),
          });
        }
        // Avanzamos a la siguiente semana
        currentWeekDate = addWeeks(currentWeekDate, 1);
      }

      // Ordenamos cronológicamente el resultado final
      return occurrences.sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime(),
      );
    }

    if (frequency === MeetingFrequency.ONCE) {
      if (isAfter(finalEndDate, currentStartDate)) {
        occurrences.push({ startDate, endDate });
      }
      return occurrences;
    }

    while (isAfter(finalEndDate, currentStartDate)) {
      let nextDate = currentStartDate;

      switch (frequency) {
        case MeetingFrequency.DAILY:
          // Para diario, nextDate es simplemente currentStartDate
          break;
        case MeetingFrequency.WEEKLY:
          nextDate =
            dayValue !== undefined
              ? setDay(currentStartDate, dayValue, { weekStartsOn: 1 })
              : currentStartDate;
          break;
        case MeetingFrequency.BIWEEKLY:
          nextDate =
            dayValue !== undefined
              ? setDay(currentStartDate, dayValue, { weekStartsOn: 1 })
              : currentStartDate;
          break;
        case MeetingFrequency.MONTHLY:
          nextDate =
            dayValue !== undefined
              ? setDate(currentStartDate, dayValue)
              : currentStartDate;
          break;
      }

      if (
        isAfter(nextDate, startDate) ||
        nextDate.getTime() === startDate.getTime()
      ) {
        if (isAfter(finalEndDate, nextDate)) {
          occurrences.push({
            startDate: nextDate,
            endDate: new Date(nextDate.getTime() + duration),
          });
        }
      }

      switch (frequency) {
        case MeetingFrequency.DAILY:
          currentStartDate = addDays(currentStartDate, 1);
          break;
        case MeetingFrequency.WEEKLY:
          currentStartDate = addWeeks(currentStartDate, 1);
          break;
        case MeetingFrequency.BIWEEKLY:
          currentStartDate = addWeeks(currentStartDate, 2);
          break;
        case MeetingFrequency.MONTHLY:
          currentStartDate = addMonths(currentStartDate, 1);
          break;
      }
    }

    return occurrences;
  }
}
