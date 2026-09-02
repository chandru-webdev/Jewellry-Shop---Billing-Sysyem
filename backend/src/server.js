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

    // costPrice: COGS per unit for margin calculation.
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Product" ADD COLUMN "costPrice" DECIMAL(12,2);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `)
    console.log('Product.costPrice column ensured.')

    // ---------- Purchase order / return models (migration may not be runtime-applied) ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
        "id" SERIAL PRIMARY KEY,
        "poNumber" TEXT NOT NULL,
        "supplierId" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalItems" INTEGER NOT NULL DEFAULT 0,
        "totalQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
        "id" SERIAL PRIMARY KEY,
        "purchaseOrderId" INTEGER NOT NULL,
        "productId" INTEGER,
        "sku" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "lineTotal" DECIMAL(12,2) NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseReturn" (
        "id" SERIAL PRIMARY KEY,
        "returnNumber" TEXT NOT NULL,
        "purchaseOrderId" INTEGER,
        "supplierId" INTEGER NOT NULL,
        "reason" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalItems" INTEGER NOT NULL DEFAULT 0,
        "totalQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseReturnItem" (
        "id" SERIAL PRIMARY KEY,
        "purchaseReturnId" INTEGER NOT NULL,
        "productId" INTEGER,
        "sku" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "lineTotal" DECIMAL(12,2) NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber")`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReturn_returnNumber_key" ON "PurchaseReturn"("returnNumber")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_supplierId_idx" ON "PurchaseReturn"("supplierId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_status_idx" ON "PurchaseReturn"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturn_createdAt_idx" ON "PurchaseReturn"("createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_purchaseReturnId_idx" ON "PurchaseReturnItem"("purchaseReturnId")`)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey"
          FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey"
          FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_supplierId_fkey"
          FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseOrderId_fkey"
          FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseReturnId_fkey"
          FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    console.log('Purchase order / return models ensured.')

    // ---------- Expense model (migration may not be runtime-applied) ----------
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" SERIAL PRIMARY KEY,
        "category" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
        "reference" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PAID',
        "createdById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_status_idx" ON "Expense"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date")`)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)
    console.log('Expense model ensured.')
  } catch (e) {
    console.error('Schema check failed:', e.message)
  }
}

// Backfill Payment records for paid invoices/orders that were created before
// payments were always recorded. This keeps the dashboard Payment Status
// card consistent with Period Sales for historical data. Idempotent — only
// inserts for records that have no payment yet.
async function backfillMissingPayments() {
  try {
    // Only records with a customer (Payment.customerId is required) and no
    // payment yet — safe to insert directly since the filter guarantees
    // `payments: { none: {} }`, so there is no existing payment to collide.
    const paidInvoices = await prisma.invoice.findMany({
      where: { customerId: { not: null }, status: { in: ['PAID', 'FINAL'] }, payments: { none: {} } },
      select: { id: true, customerId: true, grandTotal: true, paymentMethod: true },
    })
    for (const inv of paidInvoices) {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          customerId: inv.customerId,
          amount: inv.grandTotal,
          method: inv.paymentMethod || 'OTHER',
          status: 'PAID',
        },
      })
    }

    const paidOrders = await prisma.order.findMany({
      where: {
        customerId: { not: null },
        status: { in: ['PAID', 'FULFILLED'] },
        payments: { none: {} },
        invoice: { is: null },
      },
      select: { id: true, customerId: true, totalAmount: true },
    })
    for (const ord of paidOrders) {
      await prisma.payment.create({
        data: {
          orderId: ord.id,
          customerId: ord.customerId,
          amount: ord.totalAmount,
          method: 'OTHER',
          status: 'PAID',
        },
      })
    }

    if (paidInvoices.length + paidOrders.length > 0) {
      console.log(`Backfilled ${paidInvoices.length} invoice + ${paidOrders.length} order payments.`)
    }
  } catch (e) {
    if (e.message?.includes('payments')) {
      console.error('Payment backfill skipped (payments relation unavailable):', e.message)
    } else {
      console.error('Payment backfill failed:', e.message)
    }
  }
}

ensureSchema()
  .then(() => backfillMissingPayments())
  .then(() => registerWebhooks().catch((err) => console.error('[WEBHOOKS] Registration error:', err.message)))
  .then(() => {
    app.listen(env.port, () => {
      console.log(`OPAL LINE ERP API running on http://localhost:${env.port}`)
    })
  })
