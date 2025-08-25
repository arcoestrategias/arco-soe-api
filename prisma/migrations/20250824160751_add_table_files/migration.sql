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

-- CreateIndex
CREATE INDEX "idx_files_module_ref" ON "files"("moduleShortcode", "referenceId");
