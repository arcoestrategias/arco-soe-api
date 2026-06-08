-- AlterTable
ALTER TABLE "MeetingMinutes" ADD COLUMN     "occurrenceId" UUID;

-- CreateIndex
CREATE INDEX "MeetingMinutes_occurrenceId_idx" ON "MeetingMinutes"("occurrenceId");

-- AddForeignKey
ALTER TABLE "MeetingMinutes" ADD CONSTRAINT "MeetingMinutes_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "MeetingOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
