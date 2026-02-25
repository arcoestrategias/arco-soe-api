import {
  PrismaClient,
  NotificationChannel,
  NotificationEntity,
  NotificationEvent,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// LÓGICA COPIADA/ADAPTADA DE notifications.service.ts
// ============================================================================

const buildNotificationTitle = (
  event: NotificationEvent,
  vars?: Record<string, any>,
) => {
  const entityLabel = vars?.entityLabel ?? 'Elemento';
  const name = vars?.name ?? vars?.title ?? 'Elemento';
  switch (event) {
    case 'DUE_SOON':
      const dueSoonText =
        entityLabel === 'Prioridad' ? 'próxima a vencer' : 'próximo a vencer';
      return `${entityLabel} ${dueSoonText}: ${name}`;
    case 'OVERDUE':
      const overdueText = entityLabel === 'Prioridad' ? 'Vencida' : 'Vencido';
      return `${entityLabel} ${overdueText}: ${name}`;
    default:
      return `Notificación: ${name}`;
  }
};

const buildNotificationMessage = (vars?: Record<string, any>) => {
  if (!vars) return 'Tienes una nueva notificación';
  const parts: string[] = [];
  if (vars.dueDate) {
    const dueDateObj =
      vars.dueDate instanceof Date ? vars.dueDate : new Date(vars.dueDate);
    const due = `${String(dueDateObj.getUTCDate()).padStart(2, '0')}/${String(
      dueDateObj.getUTCMonth() + 1,
    ).padStart(2, '0')}/${dueDateObj.getUTCFullYear()}`;
    parts.push(`Vence: ${due}`);
  }
  if (vars.actorName) {
    parts.push(`Por: ${vars.actorName}`);
  }
  if (vars.message) {
    parts.push(String(vars.message));
  }
  return parts.length > 0 ? parts.join(' • ') : 'Tienes una nueva notificación';
};

const buildPayload = (
  entityId: string,
  vars?: Record<string, any>,
): Record<string, any> => {
  const base = vars ?? {};
  return {
    entityId,
    name: base.name,
    dueDate: base.dueDate,
    ...base,
  };
};

const generateDailyDedupeKey = (
  recipientId: string,
  entityType: NotificationEntity,
  entityId: string,
  event: NotificationEvent,
  channel: NotificationChannel,
  at: Date,
) => {
  const day = at.toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = [recipientId, entityType, entityId, event, channel, day].join(
    '|',
  );
  return createHash('sha1').update(raw).digest('hex');
};

const buildOverdueNextDayRunAt = (dueDate: Date): Date => {
  const y = dueDate.getUTCFullYear();
  const m = dueDate.getUTCMonth();
  const d = dueDate.getUTCDate();
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
};

// ============================================================================

// Estructura para el reporte
type StatCounts = {
  overdue: number; // Notificaciones de vencimiento
  dueSoon: number; // Avisos previos
};

type PositionReport = {
  priorities: StatCounts;
  objectives: StatCounts;
  immediateList: string[]; // Lista de títulos que se envían HOY
};

// Mapa: NombreEmpresa -> NombrePosicion -> Reporte
const report: Record<string, Record<string, PositionReport>> = {};

async function main() {
  console.log(
    ' Iniciando la programación de notificaciones para datos históricos...',
  );

  // --- PASO 0: LIMPIEZA PREVIA ---
  // Para asegurar la idempotencia y corregir errores de ejecuciones pasadas,
  // eliminamos todas las notificaciones PENDIENTES que este script podría haber creado.
  console.log(
    'Limpiando notificaciones programadas (PEN) existentes para evitar duplicados...',
  );
  const { count: deletedCount } = await prisma.notification.deleteMany({
    where: {
      status: 'PEN',
      event: { in: ['DUE_SOON', 'OVERDUE'] },
      entityType: { in: ['PRIORITY', 'OBJECTIVE_GOAL'] },
    },
  });
  console.log(
    `  -> Se eliminaron ${deletedCount} notificaciones pendientes antiguas.`,
  );
  // ---------------------------------

  const now = new Date();
  const notificationsToCreate: Prisma.NotificationCreateManyInput[] = [];

  // 1. Procesar Prioridades
  console.log(
    'Buscando prioridades activas (incluyendo vencidas) del año 2026...',
  );
  const priorities = await prisma.priority.findMany({
    where: {
      isActive: true,
      status: 'OPE',
      year: 2026, // <--- Filtro exclusivo para 2026
    },
    include: {
      position: {
        include: {
          businessUnit: {
            select: {
              id: true,
              companyId: true,
              // Traemos el nombre de la empresa para el reporte
              company: { select: { name: true } },
            },
          },
          userLinks: { select: { userId: true }, take: 1 },
        },
      },
    },
  });
  console.log(
    `  -> Encontradas ${priorities.length} prioridades para procesar.`,
  );

  for (const priority of priorities) {
    const scope = priority.position;
    const recipientId = scope?.userLinks[0]?.userId;
    const companyId = scope?.businessUnit?.companyId;
    const companyName = scope?.businessUnit?.company?.name || 'Sin Empresa';
    const positionName = scope?.name || 'Sin Posición';
    const businessUnitId = scope?.businessUnit?.id;
    const dueDate = priority.untilAt;

    if (!recipientId || !companyId || !businessUnitId || !dueDate) {
      continue;
    }

    const baseVariables = {
      entityLabel: 'Prioridad',
      name: priority.name,
      dueDate,
    };

    const eventsToSchedule = [
      {
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 4 * 86_400_000),
      },
      {
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 1 * 86_400_000),
      },
      { event: 'OVERDUE', runAt: dueDate },
    ] as const;

    for (const { event, runAt } of eventsToSchedule) {
      let originalScheduledAt = runAt;
      if (event === 'OVERDUE') {
        originalScheduledAt = buildOverdueNextDayRunAt(originalScheduledAt);
      }

      let finalScheduledAt = originalScheduledAt;
      const isPast = originalScheduledAt <= now;

      if (isPast) {
        // Si es un aviso previo (DUE_SOON) y la fecha ya pasó, lo ignoramos (ya no sirve avisar "pronto").
        if (event !== 'OVERDUE') continue;

        // Si es vencimiento (OVERDUE) y ya pasó, lo programamos para AHORA (catch-up).
        finalScheduledAt = now;
      }

      // Si es futuro O es un catch-up de hoy
      if (finalScheduledAt >= now || isPast) {
        const payload = buildPayload(priority.id, {
          ...baseVariables,
          goalMonth: priority.month,
          goalYear: priority.year,
        });
        const title = buildNotificationTitle(event, payload);
        const message = buildNotificationMessage(payload);

        for (const channel of [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ]) {
          const dedupeKey = generateDailyDedupeKey(
            recipientId,
            'PRIORITY',
            priority.id,
            event,
            channel,
            originalScheduledAt, // Usamos la fecha ORIGINAL para la clave única (evita duplicados si corres el script mañana)
          );
          notificationsToCreate.push({
            companyId,
            businessUnitId,
            recipientId,
            entityType: 'PRIORITY',
            entityId: priority.id,
            event,
            channel,
            title,
            message,
            payload,
            status: NotificationStatus.PEN,
            scheduledAt: finalScheduledAt, // Pero programamos para ejecutarse AHORA (o en el futuro real)
            dedupeKey,
          });

          // --- Lógica de Reporte ---
          if (!report[companyName]) report[companyName] = {};
          if (!report[companyName][positionName]) {
            report[companyName][positionName] = {
              priorities: { overdue: 0, dueSoon: 0 },
              objectives: { overdue: 0, dueSoon: 0 },
              immediateList: [],
            };
          }

          if (event === 'OVERDUE') {
            report[companyName][positionName].priorities.overdue++;
          } else {
            report[companyName][positionName].priorities.dueSoon++;
          }

          // Si se programa para AHORA (o antes), se envía hoy.
          // Filtramos por canal IN_APP para no duplicar el texto en el reporte visual.
          if (
            finalScheduledAt <= now &&
            channel === NotificationChannel.IN_APP
          ) {
            report[companyName][positionName].immediateList.push(
              `[${event}] Prioridad: ${priority.name}`,
            );
          }
          // -------------------------
        }
      }
    }
  }
  console.log(
    `  -> ${priorities.length > 0 ? '✅' : '⚪'} Prioridades procesadas.`,
  );

  // 2. Procesar Metas de Objetivos (ObjectiveGoal)
  console.log(
    '\nBuscando metas de objetivos activas (incluyendo vencidas) del año 2026...',
  );
  const goals = await prisma.objectiveGoal.findMany({
    where: {
      isActive: true,
      year: 2026, // <--- Filtro exclusivo para 2026
    },
    include: {
      objective: {
        include: {
          position: {
            include: {
              businessUnit: {
                select: {
                  id: true,
                  companyId: true,
                  // Traemos el nombre de la empresa para el reporte
                  company: { select: { name: true } },
                },
              },
              userLinks: { select: { userId: true }, take: 1 },
            },
          },
        },
      },
    },
  });
  console.log(`  -> Encontradas ${goals.length} metas para procesar.`);

  for (const goal of goals) {
    const objective = goal.objective;
    const scope = objective?.position;
    const recipientId = scope?.userLinks[0]?.userId;
    const companyId = scope?.businessUnit?.companyId;
    const companyName = scope?.businessUnit?.company?.name || 'Sin Empresa';
    const positionName = scope?.name || 'Sin Posición';
    const businessUnitId = scope?.businessUnit?.id;

    if (!recipientId || !companyId || !businessUnitId || !objective) {
      continue;
    }

    // El vencimiento es el último día del mes de la meta.
    // Lógica robusta: Para obtener el último día de `goal.month`, pedimos el día 0 del mes SIGUIENTE.
    // El mes en JS Date es 0-11, pero en nuestra BD es 1-12.
    const jsMonthIndexForNextMonth = goal.month; // Ene (1) -> Feb (1), Dic (12) -> Ene año sig (12)
    const dueDate = new Date(Date.UTC(goal.year, jsMonthIndexForNextMonth, 0));

    const baseVariables = {
      entityLabel: 'Objetivo',
      name: objective.name,
      dueDate,
      goalMonth: goal.month,
      goalYear: goal.year,
    };

    const eventsToSchedule = [
      {
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 4 * 86_400_000),
      },
      {
        event: 'DUE_SOON',
        runAt: new Date(dueDate.getTime() - 1 * 86_400_000),
      },
      { event: 'OVERDUE', runAt: dueDate },
    ] as const;

    for (const { event, runAt } of eventsToSchedule) {
      let originalScheduledAt = runAt;
      if (event === 'OVERDUE') {
        originalScheduledAt = buildOverdueNextDayRunAt(originalScheduledAt);
      }

      let finalScheduledAt = originalScheduledAt;
      const isPast = originalScheduledAt <= now;

      if (isPast) {
        if (event !== 'OVERDUE') continue;

        // LÓGICA CLAVE: Para objetivos pasados, solo notificar si NO tienen valor cargado.
        // Si ya tiene valor (realValue !== null), no molestamos al usuario.
        if (goal.realValue !== null) continue;

        // Si falta el valor, notificamos AHORA.
        finalScheduledAt = now;
      }

      if (finalScheduledAt >= now || isPast) {
        const payload = buildPayload(objective.id, baseVariables);
        const title = buildNotificationTitle(event, payload);
        const message = buildNotificationMessage(payload);

        for (const channel of [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ]) {
          // Para metas, el entityId es el del objetivo, pero el payload distingue el mes/año
          const dedupeKey = generateDailyDedupeKey(
            recipientId,
            'OBJECTIVE_GOAL',
            objective.id,
            event,
            channel,
            originalScheduledAt, // Clave basada en fecha original
          );
          notificationsToCreate.push({
            companyId,
            businessUnitId,
            recipientId,
            entityType: 'OBJECTIVE_GOAL',
            entityId: objective.id,
            event,
            channel,
            title,
            message,
            payload,
            status: NotificationStatus.PEN,
            scheduledAt: finalScheduledAt, // Ejecución inmediata (o futura)
            dedupeKey,
          });

          // --- Lógica de Reporte ---
          if (!report[companyName]) report[companyName] = {};
          if (!report[companyName][positionName]) {
            report[companyName][positionName] = {
              priorities: { overdue: 0, dueSoon: 0 },
              objectives: { overdue: 0, dueSoon: 0 },
              immediateList: [],
            };
          }

          if (event === 'OVERDUE') {
            report[companyName][positionName].objectives.overdue++;
          } else {
            report[companyName][positionName].objectives.dueSoon++;
          }

          // Si se programa para AHORA (o antes), se envía hoy.
          if (
            finalScheduledAt <= now &&
            channel === NotificationChannel.IN_APP
          ) {
            const monthName = new Date(
              Date.UTC(goal.year, goal.month - 1, 1),
            ).toLocaleString('es-ES', { month: 'long' });
            report[companyName][positionName].immediateList.push(
              `[${event}] Objetivo: ${objective.name} (${monthName} ${goal.year})`,
            );
          }
          // -------------------------
        }
      }
    }
  }
  console.log(
    `  -> ${goals.length > 0 ? '✅' : '⚪'} Metas de objetivos procesadas.`,
  );

  // --- IMPRIMIR REPORTE DETALLADO ---
  console.log('\n=============================================');
  console.log('REPORTE DE NOTIFICACIONES GENERADAS');
  console.log('=============================================');

  for (const [compName, positions] of Object.entries(report)) {
    console.log(`\n Empresa: ${compName}`);
    for (const [posName, stats] of Object.entries(positions)) {
      const totalPrio = stats.priorities.overdue + stats.priorities.dueSoon;
      const totalObj = stats.objectives.overdue + stats.objectives.dueSoon;

      if (totalPrio === 0 && totalObj === 0) continue;

      console.log(`    Posición: ${posName}`);
      if (totalPrio > 0) {
        console.log(
          `      🔹 Prioridades: ${stats.priorities.overdue} atrasadas (Overdue) | ${stats.priorities.dueSoon} programadas (Due Soon)`,
        );
      }
      if (totalObj > 0) {
        console.log(
          `      🔹 Objetivos:   ${stats.objectives.overdue} atrasadas (Overdue) | ${stats.objectives.dueSoon} programadas (Due Soon)`,
        );
      }

      if (stats.immediateList.length > 0) {
        console.log(`      SE ENVIARÁN HOY (${stats.immediateList.length}):`);
        stats.immediateList.forEach((item) =>
          console.log(`         - ${item}`),
        );
      }
    }
  }
  console.log('=============================================\n');
  // ----------------------------------

  // 3. Crear todas las notificaciones en batch
  if (notificationsToCreate.length > 0) {
    console.log(
      `\n Creando ${notificationsToCreate.length} registros de notificación en la base de datos...`,
    );
    const { count } = await prisma.notification.createMany({
      data: notificationsToCreate,
      skipDuplicates: true, // ¡Clave para que sea seguro re-ejecutar!
    });
    console.log(`  -> Se crearon ${count} nuevas notificaciones.`);
  } else {
    console.log('\n✅ No se encontraron nuevas notificaciones para programar.');
  }

  console.log('\n=============================================');
  console.log('✅ Proceso de programación histórica finalizado.');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
