-- DropIndex
DROP INDEX "Customer_supabaseUserId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "supabaseUserId",
ADD COLUMN     "firebaseUid" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_firebaseUid_key" ON "Customer"("firebaseUid");
