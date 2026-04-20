-- ============================================
-- NUEVA MIGRACIÓN - Responsables en Tareas
-- Fecha: 2026-04-XX
-- ============================================
-- 1. Crear tabla ExternalUser (si no existe)
CREATE TABLE IF NOT EXISTS "ExternalUser" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(500) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "companyId" UUID NOT NULL,  -- ← NUEVO
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Constraint único compuesto (company + email)
ALTER TABLE "ExternalUser" ADD CONSTRAINT "ExternalUser_companyId_email_key" UNIQUE ("companyId", "email");
CREATE INDEX IF NOT EXISTS "ExternalUser_companyId_idx" ON "ExternalUser"("companyId");
CREATE INDEX IF NOT EXISTS "ExternalUser_isActive_idx" ON "ExternalUser"("isActive");
-- Foreign key a Company
ALTER TABLE "ExternalUser" ADD CONSTRAINT "ExternalUser_companyId_fkey" 
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    
-- 2. Si existe, eliminar columna projectParticipantId de ProjectTask
ALTER TABLE "ProjectTask" DROP COLUMN IF EXISTS "projectParticipantId";

-- 3. Crear nueva tabla ProjectTaskParticipant con nueva estructura
CREATE TABLE IF NOT EXISTS "ProjectTaskParticipant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "taskId" UUID NOT NULL REFERENCES "ProjectTask"("id") ON DELETE CASCADE,
    "positionId" UUID NULL REFERENCES "Position"("id") ON DELETE CASCADE,
    "externalUserId" UUID NULL REFERENCES "ExternalUser"("id") ON DELETE CASCADE,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdBy" UUID,
    "updatedBy" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ProjectTaskParticipant_taskId_positionId_unique" UNIQUE ("taskId", "positionId"),
    CONSTRAINT "ProjectTaskParticipant_taskId_externalUserId_unique" UNIQUE ("taskId", "externalUserId")
);

CREATE INDEX IF NOT EXISTS "ProjectTaskParticipant_taskId_idx" ON "ProjectTaskParticipant"("taskId");
CREATE INDEX IF NOT EXISTS "ProjectTaskParticipant_positionId_idx" ON "ProjectTaskParticipant"("positionId");
CREATE INDEX IF NOT EXISTS "ProjectTaskParticipant_externalUserId_idx" ON "ProjectTaskParticipant"("externalUserId");

-- 4. Eliminar tabla ProjectParticipant (si existe)
DROP TABLE IF EXISTS "ProjectParticipant" CASCADE;