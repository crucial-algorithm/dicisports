ALTER TABLE "events" RENAME COLUMN  "location" to "place_name";
ALTER TABLE "events" ADD COLUMN  "location" JSONB;

