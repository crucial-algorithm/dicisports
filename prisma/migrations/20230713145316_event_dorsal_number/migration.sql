/*
  Warnings:

  - You are about to drop the column `dorsal_starting_number` on the `events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[event_id,dorsal]` on the table `race_participants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "dorsal_starting_number";

-- AlterTable
ALTER TABLE "race_participants" ADD COLUMN     "dorsal" INTEGER,
ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "event_dorsal_count" (
    "id" TEXT NOT NULL,
    "dorsal" INTEGER NOT NULL DEFAULT 0,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_dorsal_count_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_dorsal_count_event_id_key" ON "event_dorsal_count"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "race_participants_event_id_dorsal_key" ON "race_participants"("event_id", "dorsal");

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_dorsal_count" ADD CONSTRAINT "event_dorsal_count_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update race participants event id
UPDATE race_participants rp
SET event_id = b.event_id
    FROM bookings b
WHERE rp.booking_id = b.id;

-- Add non null constraint to event id on race_participants table
ALTER TABLE race_participants ALTER COLUMN event_id SET NOT NULL;
