/*
  Warnings:

  - The `status` column on the `race_participants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[participant_id,race_id,booking_id]` on the table `race_participants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RaceParticipantStatus" AS ENUM ('auto', 'deleted');

-- AlterEnum
ALTER TYPE "CheckoutStatus" ADD VALUE 'deleted';

-- AlterTable
ALTER TABLE "race_participants" DROP COLUMN "status",
ADD COLUMN     "status" "RaceParticipantStatus" NOT NULL DEFAULT 'auto';
