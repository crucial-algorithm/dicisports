-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "expired_warning_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "url_shortener" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "url_shortener_pkey" PRIMARY KEY ("id")
);
