-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN "weeklyConfigEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Indicator" ADD COLUMN "periodicity" TEXT;
ALTER TABLE "Indicator" ADD COLUMN "measurementCount" INTEGER;
ALTER TABLE "Indicator" ADD COLUMN "calculationMethod" TEXT;

-- AlterTable
ALTER TABLE "ObjectiveGoal" ADD COLUMN "measurementCount" INTEGER;

-- CreateTable
CREATE TABLE "objective_goal_measurements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "objectiveGoalId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "result" DECIMAL,
    "measuredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" VARCHAR(300),
    "isIgnore" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "objective_goal_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objective_goal_measurements_objectiveGoalId_idx" ON "objective_goal_measurements"("objectiveGoalId");
CREATE INDEX "objective_goal_measurements_objectiveGoalId_isActive_idx" ON "objective_goal_measurements"("objectiveGoalId", "isActive");

-- AddForeignKey
ALTER TABLE "objective_goal_measurements" ADD CONSTRAINT "objective_goal_measurements_objectiveGoalId_fkey" FOREIGN KEY ("objectiveGoalId") REFERENCES "ObjectiveGoal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;