/*
  Warnings:

  - You are about to drop the column `organiser_id` on the `discount_codes` table. All the data in the column will be lost.
  - You are about to drop the column `organiser_id` on the `mailing_list` table. All the data in the column will be lost.
  - The `status` column on the `organizers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[email,organizer_id]` on the table `mailing_list` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizer_id` to the `discount_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizer_id` to the `mailing_list` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('PENDING', 'APPROVED');

-- DropForeignKey
ALTER TABLE "discount_codes"
    DROP CONSTRAINT "discount_codes_organiser_id_fkey";

-- DropForeignKey
ALTER TABLE "mailing_list"
    DROP CONSTRAINT "mailing_list_organiser_id_fkey";

-- DropIndex
DROP INDEX "mailing_list_email_organiser_id_key";

-- AlterTable
ALTER TABLE "discount_codes"
    RENAME COLUMN "organiser_id" TO "organizer_id";

-- AlterTable
ALTER TABLE "mailing_list"
    RENAME COLUMN "organiser_id" TO "organizer_id";

-- AlterTable
ALTER TABLE "organizers"
    RENAME COLUMN status to status_to_drop;
ALTER TABLE "organizers"
    ADD COLUMN status "OrganizerStatus" NOT NULL DEFAULT 'PENDING';
UPDATE organizers
SET status = status_to_drop::text::"OrganizerStatus";
ALTER TABLE "organizers"
    DROP COLUMN status_to_drop;

-- DropEnum
DROP TYPE "OrganiserStatus";

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_email_organizer_id_key" ON "mailing_list" ("email", "organizer_id");

-- AddForeignKey
ALTER TABLE "discount_codes"
    ADD CONSTRAINT "discount_codes_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailing_list"
    ADD CONSTRAINT "mailing_list_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
