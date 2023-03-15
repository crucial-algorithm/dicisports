/*
  Warnings:

  - You are about to drop the column `address` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `event_description` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "address",
DROP COLUMN "event_description",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;
