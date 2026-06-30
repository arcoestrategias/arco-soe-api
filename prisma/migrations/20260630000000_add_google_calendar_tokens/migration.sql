ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleCalendarAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleCalendarRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleCalendarTokenExpiresAt" TIMESTAMP(3);