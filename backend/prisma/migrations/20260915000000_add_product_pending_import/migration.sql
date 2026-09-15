-- AlterTable
ALTER TABLE "Product" ADD COLUMN "pendingImport" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_pendingImport_idx" ON "Product"("pendingImport");