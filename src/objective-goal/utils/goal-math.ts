// p.ej. GREEN: 1, YELLOW: 0.5, RED: 0
export const LIGHT_NUM = {
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
} as const;

export type LightColor = keyof typeof LIGHT_NUM;
export type LightNumeric = (typeof LIGHT_NUM)[LightColor];

const ACTION_BY_LIGHT: Record<LightNumeric, string> = {
  [LIGHT_NUM.GREEN]: 'Analizar causa y establecer prioridades de mantenimiento',
  [LIGHT_NUM.YELLOW]: 'Analizar causa y establecer prioridades de mejora',
  [LIGHT_NUM.RED]: 'Analizar causa y establecer prioridades correctivas',
};

export type Tendence = 'POS' | 'NEG';
export type Measurement = 'POR' | 'RAT' | 'UNI' | 'MON' | 'UNC';

export type CalcInput = {
  tendence: Tendence;
  measurement: Measurement;
  goalValue?: number | null;
  realValue?: number | null;
  baseValue?: number | null; // <--- Nuevo parámetro
  rangeExceptional?: number | null; // R1 %
  rangeInacceptable?: number | null; // R2 %
  month: number;
  year: number;
  now?: Date;
  shouldRecalcLight: boolean; // recalcular semáforo solo si vino realValue en el payload
};

export type CalcOutput = {
  realPercentage: number | null;
  indexCompliance: number | null;
  lightNumeric?: LightNumeric; // ← ahora numérico
  action: string | null;
};

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

export function computeGoalMetrics(input: CalcInput): CalcOutput {
  const {
    tendence,
    goalValue,
    realValue,
    baseValue,
    rangeExceptional,
    rangeInacceptable,
    month,
    year,
    now = new Date(),
    shouldRecalcLight,
  } = input;

  const g = goalValue ?? 0;
  const r = realValue ?? 0;
  const b = baseValue; // puede ser null/undefined

  // === % cumplimiento ===
  let realP = 0;

  // 1. Caso especial: Meta 0 y Real 0 => 100% (Cumplimiento perfecto)
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
  // 3. Fórmula Estándar (Proporción Directa)
  else if (tendence === 'POS') {
    realP = g === 0 ? 0 : (r / g) * 100;
  } else {
    realP = r === 0 ? 0 : (g / r) * 100;
  }

  realP = clamp0(realP);
  const indexCompliance = realP;

  // === Semáforo numérico / Acción (solo si llegó realValue) ===
  let lightNumeric: LightNumeric | undefined;
  let action: string | null = null;

  if (shouldRecalcLight) {
    if (g === 0 && r === 0) {
      lightNumeric = LIGHT_NUM.GREEN;
    } else {
      const R1 = rangeExceptional ?? null; // umbral superior
      const R2 = rangeInacceptable ?? null; // umbral inferior

      if (R1 !== null && R2 !== null) {
        if (realP > R1) lightNumeric = LIGHT_NUM.GREEN;
        else if (realP >= R2) lightNumeric = LIGHT_NUM.YELLOW;
        else lightNumeric = LIGHT_NUM.RED;
      } else {
        // sin umbrales: estado intermedio
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
