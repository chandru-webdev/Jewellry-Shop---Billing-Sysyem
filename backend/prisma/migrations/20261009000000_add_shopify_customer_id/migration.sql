-- Store the Shopify customer id so a returning customer can be matched even
-- when the order payload has no usable email/phone (redacted or guest-mapped).
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "shopifyCustomerId" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_shopifyCustomerId_key"
  ON "Customer"("shopifyCustomerId");
