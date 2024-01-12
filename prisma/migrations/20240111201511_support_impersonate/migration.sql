/*
  Warnings:

  - A unique constraint covering the columns `[participant_id,race_id,booking_id]` on the table `race_participants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "impersonated_user" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "race_participants_participant_id_race_id_booking_id_key" ON "race_participants"("participant_id", "race_id", "booking_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonated_user_fkey" FOREIGN KEY ("impersonated_user") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
