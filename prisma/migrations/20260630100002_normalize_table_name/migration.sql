-- Normalizar nombre de tabla objective_goal_measurements → ObjectiveGoalMeasurement
-- para mantener consistencia CamelCase con el resto de tablas (ObjectiveGoal, Indicator, etc.)

ALTER TABLE "objective_goal_measurements" RENAME TO "ObjectiveGoalMeasurement";

ALTER INDEX "objective_goal_measurements_pkey" RENAME TO "ObjectiveGoalMeasurement_pkey";

ALTER TABLE "ObjectiveGoalMeasurement" RENAME CONSTRAINT "objective_goal_measurements_objectiveGoalId_fkey"
  TO "ObjectiveGoalMeasurement_objectiveGoalId_fkey";

ALTER INDEX IF EXISTS "objective_goal_measurements_objectiveGoalId_idx"
  RENAME TO "ObjectiveGoalMeasurement_objectiveGoalId_idx";

ALTER INDEX IF EXISTS "objective_goal_measurements_objectiveGoalId_isActive_idx"
  RENAME TO "ObjectiveGoalMeasurement_objectiveGoalId_isActive_idx";

ALTER INDEX IF EXISTS "objective_goal_measurements_objectiveGoalId_index_idx"
  RENAME TO "ObjectiveGoalMeasurement_objectiveGoalId_index_idx";
