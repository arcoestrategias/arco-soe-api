-- CreateTable
CREATE TABLE "ObjectiveGoal" (
    "id" TEXT NOT NULL,
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
    "objectiveId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveGoal_objectiveId_month_year_key" ON "ObjectiveGoal"("objectiveId", "month", "year");

-- AddForeignKey
ALTER TABLE "ObjectiveGoal" ADD CONSTRAINT "ObjectiveGoal_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
