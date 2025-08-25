-- CreateIndex
CREATE INDEX "idx_files_module_ref_screen" ON "files"("moduleShortcode", "referenceId", "screenKey");
