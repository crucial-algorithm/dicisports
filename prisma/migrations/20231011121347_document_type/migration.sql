/*
  Warnings:

  - Added the required column `file_name` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Made the column `path` on table `documents` required. This step will fail if there are existing NULL values in that column.

*/

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "path" SET NOT NULL;
