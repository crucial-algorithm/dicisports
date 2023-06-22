-- DropForeignKey
ALTER TABLE "organizers" DROP CONSTRAINT "organizers_userId_fkey";

-- DropIndex
DROP INDEX "organizers_userId_key";

-- AlterTable
ALTER TABLE organizers RENAME COLUMN "userId" to user_id;

-- CreateIndex
CREATE UNIQUE INDEX "organizers_user_id_key" ON "organizers"("user_id");

-- AddForeignKey
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
