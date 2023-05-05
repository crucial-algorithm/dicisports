/*
  Warnings:

  - You are about to drop the column `content` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `is_regulation` on the `documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "content",
DROP COLUMN "is_regulation";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "regulation_content" TEXT,
ADD COLUMN     "regulation_path" TEXT;
