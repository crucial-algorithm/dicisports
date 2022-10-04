/*
  Warnings:

  - You are about to drop the column `key` on the `documents` table. All the data in the column will be lost.
  - Added the required column `path` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE SEQUENCE "documents_position_seq";
ALTER TABLE "documents" DROP COLUMN "key",
ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT E'auto',
ALTER COLUMN "position" SET DEFAULT nextval('documents_position_seq');
ALTER SEQUENCE "documents_position_seq" OWNED BY "documents"."position";
