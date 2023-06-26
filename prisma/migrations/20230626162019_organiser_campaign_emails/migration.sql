-- CreateTable
CREATE TABLE "campaign_emails" (
    "email" TEXT NOT NULL,
    "organiser_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_emails_email_organiser_id_key" ON "campaign_emails"("email", "organiser_id");

-- AddForeignKey
ALTER TABLE "campaign_emails" ADD CONSTRAINT "campaign_emails_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
