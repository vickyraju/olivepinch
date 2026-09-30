-- DropIndex
DROP INDEX "Customer_phone_key";

-- DropIndex
DROP INDEX "Customer_firebaseUid_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "firebaseUid",
ADD COLUMN     "supabaseUserId" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_supabaseUserId_key" ON "Customer"("supabaseUserId");
