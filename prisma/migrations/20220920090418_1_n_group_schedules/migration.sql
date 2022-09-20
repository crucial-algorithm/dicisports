-- CreateTable
CREATE TABLE "group_schedule" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "time_of_day" INTEGER NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "group_schedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "group_schedule"
    ADD CONSTRAINT "group_schedule_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data migration process (added manually)
INSERT INTO group_schedule
    (SELECT id, day_of_week, time_of_day, id FROM groups WHERE status ='published');
