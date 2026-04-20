/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ProjectTaskParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `ProjectTaskParticipant` table. All the data in the column will be lost.
  - Made the column `isActive` on table `ExternalUser` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isActive` on table `ProjectTaskParticipant` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ResponsibilityType" AS ENUM ('IMPUTABLE', 'SUPPORT', 'INFORMED');

-- DropForeignKey
ALTER TABLE "ProjectTaskParticipant" DROP CONSTRAINT "ProjectTaskParticipant_externalUserId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectTaskParticipant" DROP CONSTRAINT "ProjectTaskParticipant_positionId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectTaskParticipant" DROP CONSTRAINT "ProjectTaskParticipant_taskId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "ExternalUser_email_idx";

-- AlterTable
ALTER TABLE "ExternalUser" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "isActive" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectTaskParticipant" DROP COLUMN "updatedAt",
DROP COLUMN "updatedBy",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "isActive" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ObjectiveResponsibility" (
    "id" UUID NOT NULL,
    "objectiveId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "type" "ResponsibilityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveResponsibility_objectiveId_positionId_key" ON "ObjectiveResponsibility"("objectiveId", "positionId");

-- AddForeignKey
ALTER TABLE "ObjectiveResponsibility" ADD CONSTRAINT "ObjectiveResponsibility_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveResponsibility" ADD CONSTRAINT "ObjectiveResponsibility_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskParticipant" ADD CONSTRAINT "ProjectTaskParticipant_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskParticipant" ADD CONSTRAINT "ProjectTaskParticipant_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskParticipant" ADD CONSTRAINT "ProjectTaskParticipant_externalUserId_fkey" FOREIGN KEY ("externalUserId") REFERENCES "ExternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ProjectTaskParticipant_taskId_externalUserId_unique" RENAME TO "ProjectTaskParticipant_taskId_externalUserId_key";

-- RenameIndex
ALTER INDEX "ProjectTaskParticipant_taskId_positionId_unique" RENAME TO "ProjectTaskParticipant_taskId_positionId_key";
