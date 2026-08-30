-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "refundedAmount" DECIMAL(8,2);
ALTER TABLE "Payment" ADD COLUMN "refundReference" TEXT;
