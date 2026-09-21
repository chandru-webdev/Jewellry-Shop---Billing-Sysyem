-- AlterTable
ALTER TABLE "Product" ADD COLUMN "shopifyStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Product" ADD COLUMN "chargeTax" BOOLEAN NOT NULL DEFAULT true;