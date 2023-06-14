-- CreateTable
CREATE TABLE "discount_codes" (
    "code" VARCHAR(20) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "fixed" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL,
    "created_by" VARCHAR(20) NOT NULL,
    "organiser_id" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
