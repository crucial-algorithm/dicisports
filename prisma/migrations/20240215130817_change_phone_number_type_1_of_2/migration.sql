-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "phone" TEXT;


-- Migrate data from one column to the other
update "participants" set phone = phone_number;
