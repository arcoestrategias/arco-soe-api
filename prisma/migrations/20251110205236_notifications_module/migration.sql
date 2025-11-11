/*
  Warnings:

  - The `createdBy` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedBy` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdBy` column on the `NotificationTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedBy` column on the `NotificationTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "NotificationEntity" AS ENUM ('PRIORITY', 'TASK', 'OBJECTIVE_GOAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('ASSIGNED', 'UPDATED', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'APPROVAL_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PEN', 'SENT', 'READ', 'EXP', 'FLD');

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" UUID,
DROP COLUMN "updatedBy",
ADD COLUMN     "updatedBy" UUID;

-- AlterTable
ALTER TABLE "NotificationTemplate" DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" UUID,
DROP COLUMN "updatedBy",
ADD COLUMN     "updatedBy" UUID;

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "entityType" "NotificationEntity" NOT NULL,
    "entityId" UUID NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PEN',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "dedupeKey" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "providerMessageId" VARCHAR(120),
    "status" VARCHAR(30) NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemSetting_companyId_businessUnitId_key_idx" ON "SystemSetting"("companyId", "businessUnitId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_companyId_businessUnitId_key_key" ON "SystemSetting"("companyId", "businessUnitId", "key");

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_scheduledAt_idx" ON "Notification"("recipientId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_businessUnitId_idx" ON "Notification"("companyId", "businessUnitId");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_event_idx" ON "Notification"("entityType", "entityId", "event");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_entityType_entityId_event_channel__key" ON "Notification"("recipientId", "entityType", "entityId", "event", "channel", "dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
