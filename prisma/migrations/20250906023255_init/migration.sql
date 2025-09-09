-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "ide" VARCHAR(13) NOT NULL,
    "legalRepresentativeName" VARCHAR(250),
    "address" VARCHAR(250),
    "phone" VARCHAR(50),
    "order" INTEGER,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "ide" VARCHAR(13),
    "legalRepresentativeName" VARCHAR(250),
    "address" VARCHAR(250),
    "phone" VARCHAR(50),
    "order" INTEGER,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "companyId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "strategicPlanId" UUID,
    "mission" TEXT,
    "vision" TEXT,
    "department" TEXT,
    "isCeo" BOOLEAN NOT NULL DEFAULT false,
    "positionSuperiorId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "ide" TEXT NOT NULL,
    "telephone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "tokenInvalidBeforeAt" TIMESTAMP(3),
    "resetToken" VARCHAR(255),
    "resetTokenExpiresAt" TIMESTAMP(3),
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "emailConfirmToken" VARCHAR(255),
    "emailConfirmExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBusinessUnit" (
    "userId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "positionId" UUID,
    "roleId" UUID,
    "isResponsible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserBusinessUnit_pkey" PRIMARY KEY ("userId","businessUnitId")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessUnitId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicPlan" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "period" INTEGER NOT NULL,
    "fromAt" TIMESTAMP(3),
    "untilAt" TIMESTAMP(3),
    "mission" VARCHAR(5000),
    "vision" VARCHAR(5000),
    "competitiveAdvantage" VARCHAR(5000),
    "status" VARCHAR(3) NOT NULL DEFAULT 'OPE',
    "businessUnitId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicValue" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "strategicPlanId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicSuccessFactor" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "strategicPlanId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicSuccessFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "perspective" VARCHAR(3) NOT NULL DEFAULT 'FIN',
    "level" VARCHAR(3) NOT NULL DEFAULT 'EST',
    "valueOrientation" VARCHAR(3) NOT NULL DEFAULT 'CRE',
    "goalValue" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPE',
    "positionId" UUID NOT NULL,
    "strategicPlanId" UUID NOT NULL,
    "indicatorId" UUID,
    "objectiveParentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "formula" VARCHAR(1000) DEFAULT 'N/A',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT DEFAULT 'MAN',
    "tendence" TEXT DEFAULT 'POS',
    "frequency" TEXT DEFAULT 'MES',
    "measurement" TEXT DEFAULT 'POR',
    "type" TEXT DEFAULT 'GES',
    "reference" TEXT DEFAULT 'MAN',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveGoal" (
    "id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "goalPercentage" DOUBLE PRECISION DEFAULT 100,
    "goalValue" DOUBLE PRECISION DEFAULT 0,
    "realPercentage" DOUBLE PRECISION DEFAULT 0,
    "realValue" DOUBLE PRECISION,
    "indexCompliance" DOUBLE PRECISION DEFAULT 0,
    "score" DOUBLE PRECISION DEFAULT 100,
    "rangeExceptional" DOUBLE PRECISION DEFAULT 0,
    "rangeInacceptable" DOUBLE PRECISION DEFAULT 0,
    "indexPerformance" DOUBLE PRECISION DEFAULT 0,
    "baseValue" DOUBLE PRECISION DEFAULT 0,
    "light" DOUBLE PRECISION DEFAULT 0,
    "observation" TEXT,
    "action" TEXT,
    "objectiveId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveGoalHist" (
    "id" UUID NOT NULL,
    "objectiveId" UUID NOT NULL,
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
    "wasActive" BOOLEAN NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" UUID,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveGoalHist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicProject" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "fromAt" TIMESTAMP(3),
    "untilAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPE',
    "budget" DOUBLE PRECISION,
    "strategicPlanId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "objectiveId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFactor" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000) DEFAULT 'N/A',
    "result" VARCHAR(1000) DEFAULT 'N/A',
    "projectId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectParticipant" (
    "id" UUID NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "projectId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "fromAt" DATE NOT NULL,
    "untilAt" DATE NOT NULL,
    "finishedAt" DATE,
    "status" VARCHAR(3) NOT NULL DEFAULT 'OPE',
    "props" VARCHAR(1000) DEFAULT 'N/A',
    "result" VARCHAR(1000) DEFAULT 'N/A',
    "methodology" VARCHAR(1000) DEFAULT 'N/A',
    "budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "limitation" VARCHAR(1000) DEFAULT 'N/A',
    "comments" VARCHAR(1000) DEFAULT 'N/A',
    "projectFactorId" UUID NOT NULL,
    "projectParticipantId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lever" (
    "id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "description" VARCHAR(1000),
    "order" INTEGER NOT NULL DEFAULT 0,
    "positionId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lever_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Priority" (
    "id" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" VARCHAR(500) NOT NULL,
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

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT,
    "description" TEXT,
    "originalName" TEXT,
    "encoding" TEXT,
    "mimeType" TEXT,
    "destination" TEXT,
    "fileName" TEXT,
    "path" TEXT,
    "sizeByte" DECIMAL(65,30),
    "extension" TEXT,
    "icon" TEXT,
    "moduleShortcode" TEXT,
    "referenceId" UUID,
    "screenKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "subject" VARCHAR(1000),
    "codeTemplate" CHAR(3) NOT NULL,
    "template" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_businessUnitId_idx" ON "Position"("businessUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_shortCode_key" ON "Module"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_ide_key" ON "User"("ide");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- CreateIndex
CREATE INDEX "UserBusinessUnit_businessUnitId_idx" ON "UserBusinessUnit"("businessUnitId");

-- CreateIndex
CREATE INDEX "UserBusinessUnit_userId_idx" ON "UserBusinessUnit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBusinessUnit_positionId_key" ON "UserBusinessUnit"("positionId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_businessUnitId_idx" ON "UserPermission"("userId", "businessUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_businessUnitId_permissionId_key" ON "UserPermission"("userId", "businessUnitId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveGoal_objectiveId_month_year_key" ON "ObjectiveGoal"("objectiveId", "month", "year");

-- CreateIndex
CREATE INDEX "ObjectiveGoalHist_objectiveId_year_month_idx" ON "ObjectiveGoalHist"("objectiveId", "year", "month");

-- CreateIndex
CREATE INDEX "ProjectFactor_projectId_idx" ON "ProjectFactor"("projectId");

-- CreateIndex
CREATE INDEX "ProjectParticipant_projectId_idx" ON "ProjectParticipant"("projectId");

-- CreateIndex
CREATE INDEX "ProjectParticipant_positionId_idx" ON "ProjectParticipant"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectParticipant_projectId_positionId_key" ON "ProjectParticipant"("projectId", "positionId");

-- CreateIndex
CREATE INDEX "ProjectTask_projectFactorId_idx" ON "ProjectTask"("projectFactorId");

-- CreateIndex
CREATE INDEX "ProjectTask_projectParticipantId_idx" ON "ProjectTask"("projectParticipantId");

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

-- CreateIndex
CREATE INDEX "idx_files_module_ref" ON "files"("moduleShortcode", "referenceId");

-- CreateIndex
CREATE INDEX "idx_files_module_ref_screen" ON "files"("moduleShortcode", "referenceId", "screenKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_codeTemplate_key" ON "NotificationTemplate"("codeTemplate");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_strategicPlanId_fkey" FOREIGN KEY ("strategicPlanId") REFERENCES "StrategicPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_positionSuperiorId_fkey" FOREIGN KEY ("positionSuperiorId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicPlan" ADD CONSTRAINT "StrategicPlan_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicValue" ADD CONSTRAINT "StrategicValue_strategicPlanId_fkey" FOREIGN KEY ("strategicPlanId") REFERENCES "StrategicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicSuccessFactor" ADD CONSTRAINT "StrategicSuccessFactor_strategicPlanId_fkey" FOREIGN KEY ("strategicPlanId") REFERENCES "StrategicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_strategicPlanId_fkey" FOREIGN KEY ("strategicPlanId") REFERENCES "StrategicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_objectiveParentId_fkey" FOREIGN KEY ("objectiveParentId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveGoal" ADD CONSTRAINT "ObjectiveGoal_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveGoalHist" ADD CONSTRAINT "ObjectiveGoalHist_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_strategicPlanId_fkey" FOREIGN KEY ("strategicPlanId") REFERENCES "StrategicPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicProject" ADD CONSTRAINT "StrategicProject_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFactor" ADD CONSTRAINT "ProjectFactor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StrategicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParticipant" ADD CONSTRAINT "ProjectParticipant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StrategicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParticipant" ADD CONSTRAINT "ProjectParticipant_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectFactorId_fkey" FOREIGN KEY ("projectFactorId") REFERENCES "ProjectFactor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectParticipantId_fkey" FOREIGN KEY ("projectParticipantId") REFERENCES "ProjectParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lever" ADD CONSTRAINT "Lever_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Priority" ADD CONSTRAINT "Priority_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Priority" ADD CONSTRAINT "Priority_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
