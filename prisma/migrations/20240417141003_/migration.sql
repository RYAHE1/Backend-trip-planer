/*
  Warnings:

  - You are about to alter the column `output` on the `trip` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `trip` MODIFY `output` JSON NULL;
