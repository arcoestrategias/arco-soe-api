-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "name" VARCHAR(1000) NOT NULL,
    "moduleShortcode" VARCHAR(20),
    "referenceId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_referenceId_idx" ON "Comment"("referenceId");
