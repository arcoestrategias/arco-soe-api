-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "agenda" JSONB;

-- CreateTable
CREATE TABLE "MeetingMinutes" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingMinutes_meetingId_idx" ON "MeetingMinutes"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinutes_meetingId_version_key" ON "MeetingMinutes"("meetingId", "version");

-- AddForeignKey
ALTER TABLE "MeetingMinutes" ADD CONSTRAINT "MeetingMinutes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
