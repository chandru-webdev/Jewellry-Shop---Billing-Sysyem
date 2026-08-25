const env = require('./config/env')
const prisma = require('./prisma/client')
const app = require('./app')

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
  } catch (e) {
    console.error('Schema check failed:', e.message)
  }
}

ensureSchema().then(() => {
  app.listen(env.port, () => {
    console.log(`OPAL LINE ERP API running on http://localhost:${env.port}`)
  })
})
