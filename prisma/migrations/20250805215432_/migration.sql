/*
  Warnings:

  - You are about to alter the column `level` on the `Objective` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(3)`.
  - You are about to alter the column `valueOrientation` on the `Objective` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - Made the column `level` on table `Objective` required. This step will fail if there are existing NULL values in that column.
  - Made the column `valueOrientation` on table `Objective` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Objective" ALTER COLUMN "perspective" SET DEFAULT 'FIN',
ALTER COLUMN "level" SET NOT NULL,
ALTER COLUMN "level" SET DEFAULT 'EST',
ALTER COLUMN "level" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "valueOrientation" SET NOT NULL,
ALTER COLUMN "valueOrientation" SET DEFAULT 'CRE',
ALTER COLUMN "valueOrientation" SET DATA TYPE VARCHAR(3);
