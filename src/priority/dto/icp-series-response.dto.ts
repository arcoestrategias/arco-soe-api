export class IcpSeriesItemDto {
  month!: number;
  year!: number;
  icp!: number; // 0..100
  totalPlanned!: number;
  totalCompleted!: number;

  // breakdown opcional, útil para barras por mes
  inProgress?: number;
  notCompletedOverdue?: number;
  notCompletedPreviousMonths?: number;
  completedOnTime?: number;
  completedLate?: number;
  completedPreviousMonths?: number;
  completedInOtherMonth?: number;
  canceled?: number;
  completedEarly?: number;
}

export class IcpSeriesResponseDto {
  positionId!: string;
  objectiveId?: string;
  from!: string; // YYYY-MM
  to!: string; // YYYY-MM
  items!: IcpSeriesItemDto[];
}
