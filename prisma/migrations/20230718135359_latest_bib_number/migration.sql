/*
  Warnings:

  - A unique constraint covering the columns `[event_id,bib_number]` on the table `race_participants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" RENAME COLUMN "dorsal_starting_number" TO "bib_starting_number";
ALTER TABLE "events" ALTER COLUMN "bib_starting_number" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "race_participants" ADD COLUMN     "bib_number" INTEGER,
ADD COLUMN     "event_id" TEXT;

-- CreateTable
CREATE TABLE "latest_bib_number" (
    "event_id" TEXT NOT NULL,
    "bib_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "latest_bib_number_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "race_participants_event_id_bib_number_key" ON "race_participants"("event_id", "bib_number");

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latest_bib_number" ADD CONSTRAINT "latest_bib_number_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update race participants event id
UPDATE race_participants rp
SET event_id = b.event_id FROM bookings b
WHERE rp.booking_id = b.id;

-- Add non null constraint to event id on race_participants table
ALTER TABLE race_participants
    ALTER COLUMN event_id SET NOT NULL;
