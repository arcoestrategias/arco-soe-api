ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "outlookCalendarAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "outlookCalendarRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "outlookCalendarTokenExpiresAt" TIMESTAMP(3);