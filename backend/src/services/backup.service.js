const prisma = require('../prisma/client')

// Prisma 7 (and decimal.js) serialize a Decimal as a plain object shaped like
// { s, e, d } when it is stored in a JSON column or passed through JSON
// serialization. Detect those by shape, not by constructor name (Prisma 7's
// class is "Decimal2", not "Decimal").
function isDecimalParts(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    typeof v.s === 'number' &&
    typeof v.e === 'number' &&
    Array.isArray(v.d)
  )
}

// Rebuild the numeric value from decimal.js { s, e, d } parts.
// The coefficient is the concatenation of d limbs (base 1e7, limbs after the
// first zero-padded to 7 digits); the exponent is e - (digitCount - 1).
function decimalPartsToNumber(parts) {
  const coeff = parts.d
    .map((limb, i) => (i === 0 ? String(limb) : String(limb).padStart(7, '0')))
    .join('')
  const digits = coeff.replace(/^0+/, '')
  if (!digits) return 0
  const exp = parts.e - (coeff.length - 1)
  const sign = parts.s < 0 ? '-' : ''
  let out
  if (exp >= 0) {
    out = digits + '0'.repeat(exp)
  } else {
    const dp = digits.length + exp
    out = dp <= 0 ? '0.' + '0'.repeat(-dp) + digits : digits.slice(0, dp) + '.' + digits.slice(dp)
  }
  const n = parseFloat(sign + out)
  return Number.isFinite(n) ? n : 0
}

// Make a Prisma result JSON-safe: BigInt -> string, Decimal -> number,
// Date -> ISO string. Everything else passes through unchanged.
function sanitize(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return undefined
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(sanitize)
    if (isDecimalParts(value)) return decimalPartsToNumber(value)
    const out = {}
    for (const k of Object.keys(value)) {
      const v = sanitize(value[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return value
}

function num(v, fallback = 0) {
  if (isDecimalParts(v)) return decimalPartsToNumber(v)
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function collectSnapshot() {
  const [
    categories,
    collections,
    suppliers,
    products,
    customers,
    orders,
    invoices,
    payments,
    inventory,
    expenses,
    metalRates,
    settings,
    bankAccounts,
    purchaseOrders,
    purchaseReturns,
    purchaseInvoices,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: 'asc' } }),
    prisma.collection.findMany({ orderBy: { id: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { id: 'asc' } }),
    prisma.product.findMany({
      include: { inventory: true },
      orderBy: { id: 'asc' },
    }),
    prisma.customer.findMany({ orderBy: { id: 'asc' } }),
    prisma.order.findMany({ include: { items: true }, orderBy: { id: 'asc' } }),
    prisma.invoice.findMany({ include: { items: true }, orderBy: { id: 'asc' } }),
    prisma.payment.findMany({ orderBy: { id: 'asc' } }),
    prisma.inventory.findMany({ orderBy: { id: 'asc' } }),
    prisma.expense.findMany({ orderBy: { id: 'asc' } }),
    prisma.metalRate.findMany({ orderBy: { id: 'asc' } }),
    prisma.setting.findMany({ orderBy: { id: 'asc' } }),
    prisma.bankAccount.findMany({ orderBy: { id: 'asc' } }),
    prisma.purchaseOrder.findMany({ include: { items: true }, orderBy: { id: 'asc' } }),
    prisma.purchaseReturn.findMany({ include: { items: true }, orderBy: { id: 'asc' } }),
    prisma.purchaseInvoice.findMany({
      include: { items: true, payments: true },
      orderBy: { id: 'asc' },
    }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    categories: sanitize(categories),
    collections: sanitize(collections),
    suppliers: sanitize(suppliers),
    products: sanitize(products),
    customers: sanitize(customers),
    orders: sanitize(orders),
    invoices: sanitize(invoices),
    payments: sanitize(payments),
    inventory: sanitize(inventory),
    expenses: sanitize(expenses),
    metalRates: sanitize(metalRates),
    settings: sanitize(settings),
    bankAccounts: sanitize(bankAccounts),
    purchaseOrders: sanitize(purchaseOrders),
    purchaseReturns: sanitize(purchaseReturns),
    purchaseInvoices: sanitize(purchaseInvoices),
  }
}

function snapshotCounts(snapshot) {
  return {
    categories: snapshot.categories.length,
    collections: snapshot.collections.length,
    suppliers: snapshot.suppliers.length,
    products: snapshot.products.length,
    customers: snapshot.customers.length,
    orders: snapshot.orders.length,
    invoices: snapshot.invoices.length,
    payments: snapshot.payments.length,
    inventory: snapshot.inventory.length,
    expenses: snapshot.expenses.length,
    settings: snapshot.settings.length,
    purchaseOrders: snapshot.purchaseOrders.length,
    purchaseReturns: snapshot.purchaseReturns.length,
    purchaseInvoices: snapshot.purchaseInvoices.length,
  }
}

async function createBackup(createdById) {
  const snapshot = await collectSnapshot()
  const data = JSON.stringify(snapshot)
  const counts = snapshotCounts(snapshot)
  const name = `Full data backup ${new Date().toLocaleString('en-IN', { hour12: false })}`
  const record = await prisma.backup.create({
    data: {
      type: 'BACKUP',
      name,
      size: Buffer.byteLength(data, 'utf8'),
      counts,
      data: snapshot,
      createdById,
    },
  })
  return record
}

function list() {
  return prisma.backup.findMany({ orderBy: { id: 'desc' } })
}

function get(id) {
  return prisma.backup.findUnique({ where: { id } })
}

// Upsert a single product row. Returns the DB product id.
async function upsertProduct(db, p, idMaps) {
  const categoryId = idMaps.category[p.categoryId] ?? null
  const collectionId = p.collectionId ? idMaps.collection[p.collectionId] ?? null : null
  const supplierId = p.supplierId ? idMaps.supplier[p.supplierId] ?? null : null
  const data = {
    sku: p.sku,
    name: p.name,
    description: p.description ?? null,
    categoryId: categoryId ?? 1,
    barcode: p.barcode ?? null,
    collectionId,
    supplierId,
    purity: num(p.purity, 92.5),
    colour: p.colour ?? null,
    grossWeight: num(p.grossWeight),
    stoneWeight: num(p.stoneWeight),
    netWeight: num(p.netWeight),
    metal: p.metal ?? 'silver',
    weight: num(p.weight),
    silverRateUsed: p.silverRateUsed != null ? num(p.silverRateUsed) : null,
    makingCharge: num(p.makingCharge),
    gstPercent: num(p.gstPercent, 3),
    stoneType: p.stoneType ?? null,
    stonePieces: p.stonePieces ?? null,
    stoneValue: p.stoneValue != null ? num(p.stoneValue) : null,
    baseAmount: num(p.baseAmount),
    gstAmount: num(p.gstAmount),
    sellingPrice: num(p.sellingPrice),
    costPrice: p.costPrice != null ? num(p.costPrice) : null,
    compareAtPrice: p.compareAtPrice != null ? num(p.compareAtPrice) : null,
    isActive: p.isActive ?? true,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    pendingImport: p.pendingImport ?? false,
    shopifyProductId: p.shopifyProductId ?? null,
    shopifyVariantId: p.shopifyVariantId ?? null,
    shopifyInventoryItemId: p.shopifyInventoryItemId ?? null,
    shopifyVendor: p.shopifyVendor ?? null,
    shopifyProductType: p.shopifyProductType ?? null,
    shopifyTags: p.shopifyTags ?? null,
    shopifyImageUrl: p.shopifyImageUrl ?? null,
    imageUrls: p.imageUrls ?? null,
    shopifyStatus: p.shopifyStatus ?? 'active',
    chargeTax: p.chargeTax ?? true,
    trackInventory: p.trackInventory ?? true,
    pushToShopify: p.pushToShopify ?? true,
  }
  const product = await db.product.upsert({
    where: { sku: p.sku },
    update: data,
    create: { ...data, createdAt: p.createdAt ? new Date(p.createdAt) : undefined },
  })
  idMaps.product[p.id] = product.id
  return product
}

// Re-push a snapshot back into the database. Everything is upserted by its
// natural key (sku, phone, orderNumber...) so running restore twice is safe.
async function restore(data, userId) {
  const snapshot = typeof data === 'string' ? JSON.parse(data) : data
  const counts = {
    category: 0, collection: 0, supplier: 0, product: 0, productUpdated: 0,
    customer: 0, order: 0, invoice: 0, payment: 0, expense: 0,
    purchaseOrder: 0, purchaseReturn: 0, purchaseInvoice: 0, settings: 0,
  }

  const idMaps = { category: {}, collection: {}, supplier: {}, product: {}, customer: {}, order: {}, invoice: {} }

  const result = await prisma.$transaction(async (db) => {
    // 1. Categories (upsert by name)
    for (const c of snapshot.categories || []) {
      const row = await db.category.upsert({
        where: { name: c.name },
        update: { description: c.description ?? null },
        create: { name: c.name, slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description: c.description ?? null },
      })
      idMaps.category[c.id] = row.id
      counts.category++
    }

    // 2. Collections (upsert by name)
    for (const col of snapshot.collections || []) {
      const row = await db.collection.upsert({
        where: { name: col.name },
        update: { description: col.description ?? null },
        create: { name: col.name, description: col.description ?? null },
      })
      idMaps.collection[col.id] = row.id
      counts.collection++
    }

    // 3. Suppliers (upsert by name)
    for (const sup of snapshot.suppliers || []) {
      const existing = await db.supplier.findFirst({ where: { name: sup.name } })
      let row
      if (existing) {
        row = await db.supplier.update({ where: { id: existing.id }, data: {
          contactPerson: sup.contactPerson ?? null, phone: sup.phone ?? null,
          email: sup.email ?? null, gstin: sup.gstin ?? null,
          address: sup.address ?? null, isActive: sup.isActive ?? true,
        } })
      } else {
        row = await db.supplier.create({ data: {
          name: sup.name, contactPerson: sup.contactPerson ?? null, phone: sup.phone ?? null,
          email: sup.email ?? null, gstin: sup.gstin ?? null,
          address: sup.address ?? null, isActive: sup.isActive ?? true,
        } })
      }
      idMaps.supplier[sup.id] = row.id
      counts.supplier++
    }

    // 4. Products (upsert by sku)
    for (const prod of snapshot.products || []) {
      const before = await db.product.findUnique({ where: { sku: prod.sku }, select: { id: true } })
      await upsertProduct(db, prod, idMaps)
      if (before) counts.productUpdated++
      else counts.product++
    }

    // 5. Inventory (upsert by productId) — inventory must reference restored product ids
    for (const inv of snapshot.inventory || []) {
      const productId = idMaps.product[inv.productId]
      if (!productId) continue
      await db.inventory.upsert({
        where: { productId },
        update: { quantity: inv.quantity ?? 0, reserved: inv.reserved ?? 0 },
        create: { productId, quantity: inv.quantity ?? 0, reserved: inv.reserved ?? 0 },
      })
    }

    // 6. Customers (upsert by phone)
    for (const cu of snapshot.customers || []) {
      const row = await db.customer.upsert({
        where: { phone: cu.phone },
        update: {
          name: cu.name, email: cu.email ?? null, address: cu.address ?? null,
          gstin: cu.gstin ?? null,
        },
        create: {
          name: cu.name, phone: cu.phone, email: cu.email ?? null,
          address: cu.address ?? null, gstin: cu.gstin ?? null,
        },
      })
      idMaps.customer[cu.id] = row.id
      counts.customer++
    }

    // 7. Orders + items (upsert by orderNumber)
    for (const ord of snapshot.orders || []) {
      const customerId = ord.customerId ? idMaps.customer[ord.customerId] ?? null : null
      const base = {
        source: ord.source || 'POS',
        customerId,
        status: ord.status || 'PENDING',
        paymentMethod: ord.paymentMethod ?? null,
        totalAmount: num(ord.totalAmount),
        shopifyOrderId: ord.shopifyOrderId || null,
      }
      await db.order.upsert({
        where: { orderNumber: ord.orderNumber },
        update: base,
        create: { orderNumber: ord.orderNumber, ...base, createdAt: ord.createdAt ? new Date(ord.createdAt) : undefined },
      })
      const restored = await db.order.findUnique({ where: { orderNumber: ord.orderNumber } })
      idMaps.order[ord.id] = restored.id
      counts.order++
      // Replace items
      await db.orderItem.deleteMany({ where: { orderId: restored.id } })
      for (const it of ord.items || []) {
        const productId = idMaps.product[it.productId]
        await db.orderItem.create({
          data: {
            orderId: restored.id, productId,
            sku: it.sku, name: it.name, quantity: it.quantity ?? 1,
            unitPrice: num(it.unitPrice), lineTotal: num(it.lineTotal),
            weight: it.weight != null ? num(it.weight) : null,
            makingCharge: it.makingCharge != null ? num(it.makingCharge) : null,
            silverRate: it.silverRate != null ? num(it.silverRate) : null,
            gstAmount: it.gstAmount != null ? num(it.gstAmount) : null,
          },
        })
      }
    }

    // 8. Invoices + items (upsert by invoiceNumber)
    for (const inv of snapshot.invoices || []) {
      const customerId = inv.customerId ? idMaps.customer[inv.customerId] ?? null : null
      const orderId = inv.orderId && idMaps.order[inv.orderId] ? idMaps.order[inv.orderId] : null
      const base = {
        customerId,
        orderId,
        date: inv.date ? new Date(inv.date) : undefined,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        paymentMethod: inv.paymentMethod ?? null,
        status: inv.status || 'DRAFT',
        subtotal: num(inv.subtotal),
        discount: num(inv.discount),
        gstTotal: num(inv.gstTotal),
        grandTotal: num(inv.grandTotal),
        totalWeight: num(inv.totalWeight),
        totalMakingCharge: num(inv.totalMakingCharge),
      }
      await db.invoice.upsert({
        where: { invoiceNumber: inv.invoiceNumber },
        update: base,
        create: { invoiceNumber: inv.invoiceNumber, ...base, createdAt: inv.createdAt ? new Date(inv.createdAt) : undefined },
      })
      const restored = await db.invoice.findUnique({ where: { invoiceNumber: inv.invoiceNumber } })
      idMaps.invoice[inv.id] = restored.id
      counts.invoice++
      await db.invoiceItem.deleteMany({ where: { invoiceId: restored.id } })
      for (const it of inv.items || []) {
        const productId = idMaps.product[it.productId]
        await db.invoiceItem.create({
          data: {
            invoiceId: restored.id, productId,
            sku: it.sku, name: it.name, quantity: it.quantity ?? 1,
            weight: num(it.weight), makingCharge: num(it.makingCharge),
            silverRate: num(it.silverRate), baseAmount: num(it.baseAmount),
            gstAmount: num(it.gstAmount), finalAmount: num(it.finalAmount),
          },
        })
      }
    }

    // 9. Payments (idempotent — skip if an identical payment already exists)
    for (const pay of snapshot.payments || []) {
      const invoiceId = pay.invoiceId ? idMaps.invoice[pay.invoiceId] ?? null : null
      const orderId = pay.orderId ? idMaps.order[pay.orderId] ?? null : null
      let customerId = pay.customerId ? idMaps.customer[pay.customerId] ?? null : null
      if (!customerId) {
        const matching = await db.payment.findFirst({
          where: { amount: num(pay.amount), invoiceId, orderId },
          select: { customerId: true },
        })
        customerId = matching?.customerId ?? null
      }
      if (!customerId) continue
      const existing = await db.payment.findFirst({
        where: {
          amount: num(pay.amount), method: pay.method || 'OTHER',
          invoiceId, orderId,
          createdAt: pay.createdAt ? new Date(pay.createdAt) : undefined,
        },
      })
      if (existing) continue
      await db.payment.create({
        data: {
          invoiceId, orderId, customerId,
          amount: num(pay.amount), pendingAmount: num(pay.pendingAmount),
          method: pay.method || 'OTHER', status: pay.status || 'PAID',
          reference: pay.reference ?? null,
          createdAt: pay.createdAt ? new Date(pay.createdAt) : undefined,
        },
      })
      counts.payment++
    }

    // 10. Expenses (idempotent — skip if an identical expense exists)
    for (const exp of snapshot.expenses || []) {
      const existing = await db.expense.findFirst({
        where: {
          category: exp.category, description: exp.description,
          amount: num(exp.amount),
          date: exp.date ? new Date(exp.date) : undefined,
        },
      })
      if (existing) continue
      await db.expense.create({
        data: {
          category: exp.category, description: exp.description, amount: num(exp.amount),
          pendingAmount: num(exp.pendingAmount), date: exp.date ? new Date(exp.date) : undefined,
          paymentMethod: exp.paymentMethod ?? 'Cash', reference: exp.reference ?? null,
          status: exp.status || 'PAID',
        },
      })
      counts.expense++
    }

    // 11. Settings (upsert by key)
    for (const st of snapshot.settings || []) {
      await db.setting.upsert({
        where: { key: st.key },
        update: { value: st.value },
        create: { key: st.key, value: st.value },
      })
      counts.settings++
    }

    // 12. Purchase orders + items (upsert by poNumber)
    const poMaps = {}
    for (const po of snapshot.purchaseOrders || []) {
      const supplierId = idMaps.supplier[po.supplierId]
      if (!supplierId) continue
      const base = {
        supplierId,
        status: po.status || 'PENDING',
        orderDate: po.orderDate ? new Date(po.orderDate) : null,
        expectedDelivery: po.expectedDelivery ? new Date(po.expectedDelivery) : null,
        gstPercent: num(po.gstPercent, 3),
        subtotal: num(po.subtotal),
        totalWeight: num(po.totalWeight),
        totalItems: po.totalItems ?? 0,
        totalQuantity: num(po.totalQuantity),
        totalAmount: num(po.totalAmount),
        notes: po.notes ?? null,
      }
      await db.purchaseOrder.upsert({
        where: { poNumber: po.poNumber },
        update: base,
        create: { poNumber: po.poNumber, ...base },
      })
      const restored = await db.purchaseOrder.findUnique({ where: { poNumber: po.poNumber } })
      poMaps[po.id] = restored.id
      counts.purchaseOrder++
      await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: restored.id } })
      for (const it of po.items || []) {
        const productId = idMaps.product[it.productId]
        await db.purchaseOrderItem.create({
          data: {
            purchaseOrderId: restored.id, productId,
            sku: it.sku, name: it.name, quantity: num(it.quantity),
            unitPrice: num(it.unitPrice), lineTotal: num(it.lineTotal),
            weight: num(it.weight), rate: num(it.rate),
          },
        })
      }
    }

    // 13. Purchase returns + items (upsert by returnNumber)
    const retMaps = {}
    for (const ret of snapshot.purchaseReturns || []) {
      const supplierId = idMaps.supplier[ret.supplierId]
      if (!supplierId) continue
      const poId = ret.purchaseOrderId ? poMaps[ret.purchaseOrderId] ?? null : null
      const base = {
        supplierId, purchaseOrderId: poId,
        status: ret.status || 'PENDING', reason: ret.reason ?? null,
        totalItems: ret.totalItems ?? 0, totalQuantity: num(ret.totalQuantity),
        totalAmount: num(ret.totalAmount),
      }
      await db.purchaseReturn.upsert({
        where: { returnNumber: ret.returnNumber },
        update: base,
        create: { returnNumber: ret.returnNumber, ...base },
      })
      const restored = await db.purchaseReturn.findUnique({ where: { returnNumber: ret.returnNumber } })
      retMaps[ret.id] = restored.id
      counts.purchaseReturn++
      await db.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: restored.id } })
      for (const it of ret.items || []) {
        const productId = idMaps.product[it.productId]
        await db.purchaseReturnItem.create({
          data: {
            purchaseReturnId: restored.id, productId,
            sku: it.sku, name: it.name, quantity: num(it.quantity),
            unitPrice: num(it.unitPrice), lineTotal: num(it.lineTotal),
            weight: num(it.weight),
          },
        })
      }
    }

    // 14. Purchase invoices + items + payments (upsert by invoiceNumber)
    for (const pi of snapshot.purchaseInvoices || []) {
      const supplierId = idMaps.supplier[pi.supplierId]
      if (!supplierId) continue
      const poId = pi.purchaseOrderId ? poMaps[pi.purchaseOrderId] ?? null : null
      const base = {
        supplierId, purchaseOrderId: poId,
        status: pi.status || 'PENDING',
        invoiceDate: pi.invoiceDate ? new Date(pi.invoiceDate) : undefined,
        dueDate: pi.dueDate ? new Date(pi.dueDate) : null,
        subtotal: num(pi.subtotal), gstPercent: num(pi.gstPercent),
        gstAmount: num(pi.gstAmount), totalAmount: num(pi.totalAmount),
        amountPaid: num(pi.amountPaid), notes: pi.notes ?? null,
      }
      await db.purchaseInvoice.upsert({
        where: { invoiceNumber: pi.invoiceNumber },
        update: base,
        create: { invoiceNumber: pi.invoiceNumber, ...base },
      })
      const restored = await db.purchaseInvoice.findUnique({ where: { invoiceNumber: pi.invoiceNumber } })
      counts.purchaseInvoice++
      await db.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: restored.id } })
      for (const it of pi.items || []) {
        const productId = idMaps.product[it.productId]
        await db.purchaseInvoiceItem.create({
          data: {
            purchaseInvoiceId: restored.id, productId,
            sku: it.sku, name: it.name, quantity: num(it.quantity),
            unitPrice: num(it.unitPrice), weight: num(it.weight), lineTotal: num(it.lineTotal),
          },
        })
      }
      await db.purchaseInvoicePayment.deleteMany({ where: { purchaseInvoiceId: restored.id } })
      for (const pay of pi.payments || []) {
        await db.purchaseInvoicePayment.create({
          data: {
            purchaseInvoiceId: restored.id, amount: num(pay.amount),
            method: pay.method || 'OTHER', reference: pay.reference ?? null,
            createdAt: pay.createdAt ? new Date(pay.createdAt) : undefined,
          },
        })
      }
    }

    return counts
  })

  return result
}

module.exports = {
  collectSnapshot,
  snapshotCounts,
  createBackup,
  list,
  get,
  restore,
  sanitize,
  isDecimalParts,
  decimalPartsToNumber,
  num,
  prisma,
}