-- AlterTable: add pending amount columns for Payments + Expenses.
-- Written by hand because `prisma migrate dev` is blocked by pre-existing
-- schema drift on Product/PurchaseOrder (imported from schema.prisma change
-- on 2026-09-09). Uses IF NOT EXISTS so the migration is safe to apply in any
-- environment, including ones where the columns were already added manually.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "pendingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "pendingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;