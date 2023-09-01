/*
  Warnings:

  - Added the required column `contact_name` to the `organizers` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "contact_name" TEXT;

-- Update all values
UPDATE "organizers"
SET "contact_name" = 'AA';

-- Set field to NOT NULL again
ALTER TABLE "organizers"
    ALTER COLUMN "contact_name"
        SET NOT NULL;