-- CreateTable
CREATE TABLE "Allergen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "Allergen"("name");

-- Seed the allergens that were previously hardcoded in both frontends, so existing
-- Customer.allergens / MenuItem.allergenTags values keep matching a real, admin-editable row.
INSERT INTO "Allergen" ("id", "name", "sortOrder", "active", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Gluten', 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Dairy', 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Tree Nuts', 2, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Peanuts', 3, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Shellfish', 4, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Soy', 5, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Eggs', 6, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Sesame', 7, true, CURRENT_TIMESTAMP);
