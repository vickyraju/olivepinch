-- On a database built from scratch the old "one item per week" rule survives as a unique INDEX (the earlier
-- migration only tried to drop a constraint of that name), which would stop the same meal appearing on two
-- days of one week. IF EXISTS keeps this a no-op where it was already removed by hand.
DROP INDEX IF EXISTS "MenuWeekItem_menuWeekId_menuItemId_key";
