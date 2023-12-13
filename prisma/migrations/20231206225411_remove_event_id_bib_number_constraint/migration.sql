-- DropForeignKey
ALTER TABLE "race_participants" DROP CONSTRAINT "race_participants_event_id_fkey";

-- DropIndex
DROP INDEX "race_participants_event_id_bib_number_key";
