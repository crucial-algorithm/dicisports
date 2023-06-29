-- CreateTable
CREATE TABLE "mailing_list" (
    "email" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_email_organiser_id_key" ON "mailing_list"("email", "organiser_id");

-- AddForeignKey
ALTER TABLE "mailing_list" ADD CONSTRAINT "mailing_list_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
