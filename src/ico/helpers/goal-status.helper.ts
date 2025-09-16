import { GoalStatusDto } from '../dto/goal-status.dto';

type BuildArgs = {
  month: number;
  year: number;
  hasCurrentGoal: boolean;
  isMeasuredCurrent: boolean;
  pendingCount: number;
};

export function buildGoalStatus({
  month,
  year,
  hasCurrentGoal,
  isMeasuredCurrent,
  pendingCount,
}: BuildArgs): GoalStatusDto {
  let statusLabel = 'No se mide';
  let statusClass = 'primary';

  if (hasCurrentGoal && !isMeasuredCurrent) {
    statusLabel = 'Pendiente';
    statusClass = 'warning';
  }
  if (hasCurrentGoal && isMeasuredCurrent) {
    statusLabel = 'Medido';
    statusClass = 'success';
  }

  return {
    month,
    year,
    hasCurrentMonthGoal: hasCurrentGoal,
    isMeasuredCurrentMonth: isMeasuredCurrent,
    pendingCount,
    statusLabel,
    statusClass,
  };
}
