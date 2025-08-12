-- CreateTable
CREATE TABLE "ObjectiveGoalHist" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "goalPercentage" DOUBLE PRECISION,
    "goalValue" DOUBLE PRECISION,
    "realPercentage" DOUBLE PRECISION,
    "realValue" DOUBLE PRECISION,
    "indexCompliance" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "rangeExceptional" DOUBLE PRECISION,
    "rangeInacceptable" DOUBLE PRECISION,
    "indexPerformance" DOUBLE PRECISION,
    "baseValue" DOUBLE PRECISION,
    "light" DOUBLE PRECISION,
    "observation" TEXT,
    "action" TEXT,
    "wasActive" BOOLEAN NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveGoalHist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObjectiveGoalHist_objectiveId_year_month_idx" ON "ObjectiveGoalHist"("objectiveId", "year", "month");

-- AddForeignKey
ALTER TABLE "ObjectiveGoalHist" ADD CONSTRAINT "ObjectiveGoalHist_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
