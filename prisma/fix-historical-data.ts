import { PrismaClient } from '@prisma/client';
import { computeGoalMetrics } from '../src/objective-goal/utils/goal-math';

const prisma = new PrismaClient();

// ✅ CONFIGURACIÓN: true porque confirmaste que el 0 era un valor por defecto (no permitido)
// Esto convertirá los 0 a null, pero respetará el 0.01
const TREAT_ZERO_AS_NULL = true;

async function main() {
  console.log('🚀 Iniciando reparación de datos históricos...');

  // 1. Sincronizar baseValue de ObjectiveGoal hacia Indicator
  // (Para que la configuración del objetivo muestre la línea base correcta)
  const objectives = await prisma.objective.findMany({
    where: { isActive: true, indicatorId: { not: null } },
    include: { indicator: true, objectiveGoals: { take: 1 } },
  });

  console.log(
    `🔄 Sincronizando indicadores de ${objectives.length} objetivos...`,
  );

  for (const obj of objectives) {
    // Si el indicador tiene base 0 pero las metas tenían otro valor, lo subimos al indicador
    const firstGoal = obj.objectiveGoals[0];
    if (
      obj.indicator &&
      obj.indicator.baseValue === 0 &&
      firstGoal &&
      firstGoal.baseValue !== 0 &&
      firstGoal.baseValue !== null
    ) {
      await prisma.indicator.update({
        where: { id: obj.indicator.id },
        data: { baseValue: firstGoal.baseValue },
      });
    }
  }
  console.log('\n✅ Indicadores sincronizados.');

  // 2. Reparar Metas (ObjectiveGoals)
  const goals = await prisma.objectiveGoal.findMany({
    where: { isActive: true },
    include: {
      objective: {
        include: { indicator: true },
      },
    },
  });

  console.log(`🔧 Recalculando ${goals.length} metas mensuales...`);

  let fixedCount = 0;
  let resetCount = 0;

  for (const goal of goals) {
    const indicator = goal.objective?.indicator;
    if (!indicator) continue;

    let nextRealValue = goal.realValue;
    let shouldReset = false;

    // Lógica de limpieza:
    // Si es 0 exacto y TREAT_ZERO_AS_NULL es true, lo tratamos como vacío.
    // Si es 0.01, NO entra aquí y se mantiene.
    if (TREAT_ZERO_AS_NULL && goal.realValue === 0) {
      nextRealValue = null;
      shouldReset = true;
    }

    if (shouldReset || nextRealValue === null) {
      // Si es null (o era 0), reseteamos a estado "no medido" (Gris)
      await prisma.objectiveGoal.update({
        where: { id: goal.id },
        data: {
          realValue: null,
          realPercentage: 0,
          indexCompliance: 0,
          light: 0, // Apagado
          action: null,
        },
      });
      resetCount++;
    } else {
      // Si tiene valor (ej: 0.01, 10, 100), recalculamos con la nueva lógica
      const computed = computeGoalMetrics({
        tendence: indicator.tendence as any,
        measurement: indicator.measurement as any,
        goalValue: goal.goalValue ?? 0,
        realValue: nextRealValue,
        baseValue: goal.baseValue ?? 0,
        rangeExceptional: goal.rangeExceptional,
        rangeInacceptable: goal.rangeInacceptable,
        month: goal.month,
        year: goal.year,
        shouldRecalcLight: true,
      });

      await prisma.objectiveGoal.update({
        where: { id: goal.id },
        data: {
          realPercentage: computed.realPercentage,
          indexCompliance: computed.indexCompliance,
          light: computed.lightNumeric ?? 0,
          action: computed.action,
        },
      });
      fixedCount++;
    }
  }

  console.log('\n=============================================');
  console.log(`✅ Proceso finalizado.`);
  console.log(`⚪ Metas reseteadas a vacío (Gris): ${resetCount}`);
  console.log(`🟢🔴 Metas recalculadas (Color correcto): ${fixedCount}`);
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
