/*
  Warnings:

  - Added the required column `created_by` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "created_by" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "races" ADD COLUMN     "track" TEXT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
