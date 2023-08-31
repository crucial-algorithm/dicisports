/*
  Warnings:

  - Added the required column `tax_number` to the `organizers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type_id` to the `organizers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "race_participants" DROP CONSTRAINT "race_participants_event_id_fkey";

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "tax_number" INTEGER NOT NULL,
ADD COLUMN     "type_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "organizer_types" (
    "id" INTEGER NOT NULL,
    "name" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "organizer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Set organizers type and nif
UPDATE "organizers" SET "type_id" = 1, "tax_number" = 123456789;

-- Set fields to NOT NULL again
ALTER TABLE "organizers"
    ALTER COLUMN "tax_number" SET NOT NULL,
ALTER COLUMN "type_id" SET NOT NULL;

-- Insert organizer types
INSERT INTO "organizer_types" (id, name, created_at, updated_at)
VALUES  (1, '{"pt": "Empresa"}', current_date, current_date),
        (2, '{"pt": "Associação"}', current_date, current_date),
        (3, '{"pt": "Clube"}', current_date, current_date),
        (4, '{"pt": "Particular"}', current_date, current_date),
        (5, '{"pt": "Município"}', current_date, current_date);