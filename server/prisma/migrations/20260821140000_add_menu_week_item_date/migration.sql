-- MenuWeekItem now pins an item to one specific day within its week, not just "available
-- somewhere this week". Existing draft rows predate day assignment, so they're backfilled to
-- their week's Monday as a placeholder -- next admin edit will reassign them to real days.
ALTER TABLE "MenuWeekItem" ADD COLUMN "date" DATE;

UPDATE "MenuWeekItem" mwi
SET "date" = mw."weekStart"
FROM "MenuWeek" mw
WHERE mw."id" = mwi."menuWeekId";

ALTER TABLE "MenuWeekItem" ALTER COLUMN "date" SET NOT NULL;

CREATE INDEX "MenuWeekItem_menuWeekId_date_idx" ON "MenuWeekItem"("menuWeekId", "date");
