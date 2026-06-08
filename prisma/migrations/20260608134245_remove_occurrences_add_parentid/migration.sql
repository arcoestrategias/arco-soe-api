/*
  Warnings:

  - You are about to drop the column `dayValue` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `daysOfWeek` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `seriesEndDate` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `occurrenceId` on the `MeetingMinutes` table. All the data in the column will be lost.
  - You are about to drop the `MeetingOccurrence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MeetingMinutes" DROP CONSTRAINT "MeetingMinutes_occurrenceId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingOccurrence" DROP CONSTRAINT "MeetingOccurrence_meetingId_fkey";

-- DropIndex
DROP INDEX "MeetingMinutes_occurrenceId_idx";

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "dayValue",
DROP COLUMN "daysOfWeek",
DROP COLUMN "frequency",
DROP COLUMN "seriesEndDate",
ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "MeetingMinutes" DROP COLUMN "occurrenceId";

-- DropTable
DROP TABLE "MeetingOccurrence";

-- DropEnum
DROP TYPE "MeetingFrequency";

-- CreateIndex
CREATE INDEX "Meeting_parentId_idx" ON "Meeting"("parentId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
