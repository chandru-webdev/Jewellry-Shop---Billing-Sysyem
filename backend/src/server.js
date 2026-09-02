const env = require('./config/env')
const prisma = require('./prisma/client')
const app = require('./app')
const { registerWebhooks } = require('./services/webhookRegister.service')

async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductPriceHistory" (
        "id" SERIAL PRIMARY KEY,
        "productId" INTEGER NOT NULL,
        "priceType" TEXT NOT NULL,
        "oldPrice" DECIMAL(12,2) NOT NULL,
        "newPrice" DECIMAL(12,2) NOT NULL,
        "changeAmount" DECIMAL(12,2) NOT NULL,
        "changePercentage" DECIMAL(8,4) NOT NULL,
        "reason" TEXT NOT NULL,
        "notes" TEXT,
        "changedById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductPriceHistory_createdAt_idx" ON "ProductPriceHistory"("createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductPriceHistory_priceType_idx" ON "ProductPriceHistory"("priceType")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProductPriceHistory_changedById_idx" ON "ProductPriceHistory"("changedById")`)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_changedById_fkey"
          FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    console.log('ProductPriceHistory schema ensured.')

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "User" ADD COLUMN "customPermissions" JSONB;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `)
    console.log('User.customPermissions column ensured.')

    // Address column on Customer (may not exist on older schemas).
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "address" TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `)

    // Payment method captured per order from Shopify (nullable, enum-backed).
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod";
      EXCEPTION WHEN duplicate_column THEN NULL;
      WHEN undefined_object THEN
        ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;
      END $$
    `)
    console.log('Order.paymentMethod column ensured.')

    // ---------- Expanded product catalog (Collections + Product columns) ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Collection" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Collection_name_key" ON "Collection"("name")`)

    // Every new Product column is additive + nullable/defaulted so existing rows survive.
    const productColumns = [
      ['barcode', 'TEXT'],
      ['collectionId', 'INTEGER'],
      ['supplierId', 'INTEGER'],
      ['purity', 'DECIMAL(5,2)'],
      ['grossWeight', 'DECIMAL(10,3)'],
      ['stoneWeight', 'DECIMAL(10,3)'],
      ['netWeight', 'DECIMAL(10,3)'],
      ['silverRateUsed', 'DECIMAL(10,2)'],
      ['compareAtPrice', 'DECIMAL(12,2)'],
      ['shopifyVendor', 'TEXT'],
      ['shopifyProductType', 'TEXT'],
      ['shopifyTags', 'TEXT'],
      ['shopifyImageUrl', 'TEXT'],
      ['trackInventory', 'BOOLEAN'],
      ['pushToShopify', 'BOOLEAN'],
    ]
    for (const [col, type] of productColumns) {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "Product" ADD COLUMN "${col}" ${type};
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
      `)
    }

    // Column-level defaults for new inserts only (avoid backfilling existing rows).
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "purity" SET DEFAULT 92.5`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "grossWeight" SET DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "stoneWeight" SET DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "netWeight" SET DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "trackInventory" SET DEFAULT true`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "pushToShopify" SET DEFAULT true`)

    // Backfill existing products: netWeight/grossWeight were the single weight column.
    await prisma.$executeRawUnsafe(`UPDATE "Product" SET "netWeight" = "weight" WHERE "netWeight" IS NULL OR "netWeight" = 0 OR "netWeight" = 0.000`)
    await prisma.$executeRawUnsafe(`UPDATE "Product" SET "grossWeight" = "weight" WHERE "grossWeight" IS NULL OR "grossWeight" = 0 OR "grossWeight" = 0.000`)

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_collectionId_idx" ON "Product"("collectionId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_supplierId_idx" ON "Product"("supplierId")`)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey"
          FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey"
          FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    console.log('Collection table + expanded Product columns ensured.')
  } catch (e) {
    console.error('Schema check failed:', e.message)
  }
}

ensureSchema()
  .then(() => registerWebhooks().catch((err) => console.error('[WEBHOOKS] Registration error:', err.message)))
  .then(() => {
    app.listen(env.port, () => {
      console.log(`OPAL LINE ERP API running on http://localhost:${env.port}`)
    })
  })
