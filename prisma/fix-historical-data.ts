import { PrismaClient } from '@prisma/client';

// ============================================================================
// LÓGICA COPIADA DE goal-math.ts PARA EVITAR DEPENDENCIAS DE IMPORTACIÓN
// (Esto permite ejecutar el script en producción donde 'src' no existe)
// ============================================================================

const LIGHT_NUM = {
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
} as const;

type LightColor = keyof typeof LIGHT_NUM;
type LightNumeric = (typeof LIGHT_NUM)[LightColor];

const ACTION_BY_LIGHT: Record<LightNumeric, string> = {
  [LIGHT_NUM.GREEN]: 'Analizar causa y establecer prioridades de mantenimiento',
  [LIGHT_NUM.YELLOW]: 'Analizar causa y establecer prioridades de mejora',
  [LIGHT_NUM.RED]: 'Analizar causa y establecer prioridades correctivas',
};

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

function computeGoalMetrics(input: {
  tendence: 'POS' | 'NEG';
  measurement: string;
  goalValue?: number | null;
  realValue?: number | null;
  baseValue?: number | null;
  rangeExceptional?: number | null;
  rangeInacceptable?: number | null;
  month: number;
  year: number;
  shouldRecalcLight: boolean;
}) {
  const {
    tendence,
    goalValue,
    realValue,
    baseValue,
    rangeExceptional,
    rangeInacceptable,
    shouldRecalcLight,
  } = input;

  const g = goalValue ?? 0;
  const r = realValue ?? 0;
  const b = baseValue;

  // === % cumplimiento ===
  let realP = 0;

  // 1. Caso especial: Meta 0 y Real 0 => 100%
  if (g === 0 && r === 0) {
    realP = 100;
  }
  // 2. Interpolación Lineal (Si existe Línea Base y es distinta a la meta)
  else if (typeof b === 'number' && b !== g) {
    if (tendence === 'POS') {
      realP = ((r - b) / (g - b)) * 100;
    } else {
      realP = ((b - r) / (b - g)) * 100;
    }
  }
  // 3. Fórmula Estándar
  else if (tendence === 'POS') {
    realP = g === 0 ? 0 : (r / g) * 100;
  } else {
    realP = r === 0 ? 0 : (g / r) * 100;
  }

  realP = clamp0(realP);
  const indexCompliance = realP;

  // === Semáforo ===
  let lightNumeric: LightNumeric | undefined;
  let action: string | null = null;

  if (shouldRecalcLight) {
    if (g === 0 && r === 0) {
      lightNumeric = LIGHT_NUM.GREEN;
    } else {
      const R1 = rangeExceptional ?? null;
      const R2 = rangeInacceptable ?? null;

      if (R1 !== null && R2 !== null) {
        if (realP > R1) lightNumeric = LIGHT_NUM.GREEN;
        else if (realP >= R2) lightNumeric = LIGHT_NUM.YELLOW;
        else lightNumeric = LIGHT_NUM.RED;
      } else {
        lightNumeric = LIGHT_NUM.YELLOW;
      }
    }
    action = ACTION_BY_LIGHT[lightNumeric!];
  }

  return {
    realPercentage: Number.isFinite(realP) ? +realP.toFixed(2) : 0,
    indexCompliance: Number.isFinite(indexCompliance)
      ? +indexCompliance.toFixed(2)
      : 0,
    lightNumeric,
    action,
  };
}
// ============================================================================

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
