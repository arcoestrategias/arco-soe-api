-- CreateTable
CREATE TABLE "Priority" (
    "id" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" VARCHAR(1000) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "fromAt" DATE NOT NULL,
    "untilAt" DATE NOT NULL,
    "finishedAt" DATE,
    "canceledAt" DATE,
    "month" INTEGER,
    "year" INTEGER,
    "status" VARCHAR(3) NOT NULL DEFAULT 'OPE',
    "positionId" UUID NOT NULL,
    "objectiveId" UUID,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Priority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Priority_positionId_idx" ON "Priority"("positionId");

-- CreateIndex
CREATE INDEX "Priority_objectiveId_idx" ON "Priority"("objectiveId");

-- CreateIndex
CREATE INDEX "Priority_status_idx" ON "Priority"("status");

-- CreateIndex
CREATE INDEX "Priority_year_month_idx" ON "Priority"("year", "month");

-- CreateIndex
CREATE INDEX "Priority_untilAt_idx" ON "Priority"("untilAt");

-- AddForeignKey
ALTER TABLE "Priority" ADD CONSTRAINT "Priority_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Priority" ADD CONSTRAINT "Priority_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
