-- Shared, business-wide weekly menu cycle: admin drafts/publishes which MenuItems are
-- available for a given Monday-start week; customers edit their existing per-day
-- Order/OrderItem rows for that week to pick from it, up to the Friday cutoff.
CREATE TABLE "MenuWeek" (
    "id"          TEXT NOT NULL,
    "weekStart"   DATE NOT NULL,
    "published"   BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuWeek_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MenuWeek_weekStart_key" ON "MenuWeek"("weekStart");

CREATE TABLE "MenuWeekItem" (
    "id"         TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    CONSTRAINT "MenuWeekItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MenuWeekItem_menuWeekId_menuItemId_key" ON "MenuWeekItem"("menuWeekId", "menuItemId");
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_menuWeekId_fkey"
  FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Marks an Order's items as an explicit choice (customer pick or admin override) rather than
-- the goal/diet default assigned at plan creation.
ALTER TABLE "Order" ADD COLUMN "menuChosenAt" TIMESTAMP(3);
