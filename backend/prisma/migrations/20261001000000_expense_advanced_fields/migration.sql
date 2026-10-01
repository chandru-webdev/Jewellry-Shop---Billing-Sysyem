-- Expense advanced fields: vendor/supplier, attachment, GST, bank account,
-- recurrence, due date, notes. Hand-written with IF NOT EXISTS / DO blocks so
-- it is safe in every environment (migrate dev is blocked by existing drift).
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "supplierId" INTEGER;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "gstApplicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "bankAccountId" INTEGER;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "recurring" TEXT NOT NULL DEFAULT 'None';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "Expense_supplierId_idx" ON "Expense"("supplierId");
CREATE INDEX IF NOT EXISTS "Expense_bankAccountId_idx" ON "Expense"("bankAccountId");
CREATE INDEX IF NOT EXISTS "Expense_createdById_idx" ON "Expense"("createdById");

DO $$
BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;