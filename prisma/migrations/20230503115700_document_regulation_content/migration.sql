-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "content" TEXT,
ADD COLUMN     "is_regulation" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "path" DROP NOT NULL;
