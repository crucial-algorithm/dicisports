/*
  Warnings:

  - Added the required column `nif` to the `organizers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type_id` to the `organizers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "race_participants" DROP CONSTRAINT "race_participants_event_id_fkey";

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "nif" INTEGER,
ADD COLUMN     "type_id" INTEGER;

-- CreateTable
CREATE TABLE "organizer_types" (
    "id" SERIAL NOT NULL,
    "name" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "organizer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Set organizers type and nif
UPDATE "organizers" SET type_id = 1, nif = 123456789;

-- Set fields to NOT NULL again
ALTER TABLE organizers
    ALTER COLUMN nif SET NOT NULL,
    ALTER COLUMN type_id SET NOT NULL;

-- Insert organizer types
INSERT INTO "organizer_types" (id, name, created_at, updated_at)
VALUES  (3, '{"pt": "Clube"}', current_date, current_date),
        (5, '{"pt": "Município"}', current_date, current_date),
        (1, '{"pt": "Empresa"}', current_date, current_date),
        (2, '{"pt": "Associação"}', current_date, current_date),
        (4, '{"pt": "Particular"}', current_date, current_date);

