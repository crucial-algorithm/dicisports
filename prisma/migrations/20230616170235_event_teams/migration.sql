-- AlterTable
ALTER TABLE "race_participants" ADD COLUMN     "team_id" TEXT;

-- CreateTable
CREATE TABLE "event_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_teams_name_event_id_key" ON "event_teams"("name", "event_id");

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "event_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_teams" ADD CONSTRAINT "event_teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
