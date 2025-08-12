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
  action?: string;
};

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

export function computeGoalMetrics(input: CalcInput): CalcOutput {
  const {
    tendence,
    goalValue,
    realValue,
    rangeExceptional,
    rangeInacceptable,
    month,
    year,
    now = new Date(),
    shouldRecalcLight,
  } = input;

  const g = goalValue ?? 0;
  const r = realValue ?? 0;

  // === % cumplimiento ===
  let realP = 0;
  if (tendence === 'POS') {
    realP = g === 0 ? 0 : (r / g) * 100;
  } else {
    realP = r === 0 ? 0 : (g / r) * 100;
  }
  realP = clamp0(realP);

  const indexCompliance = realP;

  // === Semáforo numérico / Acción (solo si llegó realValue) ===
  let lightNumeric: LightNumeric | undefined;
  let action: string | undefined;

  if (shouldRecalcLight) {
    if ((realValue ?? null) === 0) {
      lightNumeric = LIGHT_NUM.RED;
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
