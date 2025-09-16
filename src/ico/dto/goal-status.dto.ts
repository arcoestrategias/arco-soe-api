export class GoalStatusDto {
  month!: number;
  year!: number;
  hasCurrentMonthGoal!: boolean;
  isMeasuredCurrentMonth!: boolean;
  pendingCount!: number; // metas sin medir hasta el mes/año consultado
  statusLabel!: string; // "No se mide" | "Pendiente" | "Medido" (u otros que ya uses)
  statusClass!: string; // "primary" | "warning" | "success" | etc.
}
