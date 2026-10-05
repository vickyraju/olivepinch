-- Drop the old unique constraint that blocked the same item anywhere in the week
-- The auto-generated name depends on Prisma version; try both common patterns.
DO $$
BEGIN
  -- Try dropping by the constraint name pattern Prisma uses for @@unique([menuWeekId, menuItemId])
  BEGIN
    ALTER TABLE "MenuWeekItem" DROP CONSTRAINT IF EXISTS "MenuWeekItem_menuWeekId_menuItemId_key";
  END;
  BEGIN
    ALTER TABLE "MenuWeekItem" DROP CONSTRAINT IF EXISTS "MenuWeekItem.menuWeekId_menuItemId";
  END;
  BEGIN
    ALTER TABLE "MenuWeekItem" DROP CONSTRAINT IF EXISTS "MenuWeekItem.menuweekid_menuitemid";
  END;
END $$;

-- Add the new unique constraint: same item can appear on different dates within the same week
-- but not twice on the same date.
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_menuWeekId_date_menuItemId_key" UNIQUE ("menuWeekId", "date", "menuItemId");
