const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const inventoryService = require('./inventory.service')
const notificationService = require('./notification.service')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

// Single source of truth for the invoice filters. Used by both the list query
// (feeds the Sales table) and the analytics aggregation, so every chart/card on
// the Sales page always reflects exactly the same filtered dataset as the table.
function buildWhere(filters = {}) {
  const where = {}
  if (filters.status) where.status = filters.status
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod
  if (filters.customerId) where.customerId = Number(filters.customerId)
  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const end = new Date(filters.dateTo)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  }
  if (filters.search) {
    const q = escapeLike(filters.search)
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q } } },
    ]
  }
  return where
}

const invoiceService = {
   async list(filters = {}) {
    const where = buildWhere(filters)

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        salesperson: { select: { id: true, name: true } },
        order: { select: { orderNumber: true } },
        _count: { select: { items: true } },
        items: { select: { quantity: true } },
      },
      orderBy: { id: 'desc' },
      take: Number(filters.limit) || 50,
    })

    return invoices.map((inv) => ({
      ...inv,
      totalQuantity: inv.items.reduce((sum, it) => sum + it.quantity, 0),
      items: undefined,
    }))
  },

  // Aggregations over the SAME filtered dataset as list(). Unlike the list
  // (which is capped at 50 rows for the table), every matching invoice is
  // counted so the KPIs/charts are exact.
  async analytics(filters = {}) {
    const where = buildWhere(filters)

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        date: true,
        grandTotal: true,
        paymentMethod: true,
        status: true,
        customerId: true,
        customer: { select: { id: true, name: true } },
        order: { select: { source: true } },
        items: { select: { quantity: true } },
      },
      orderBy: { date: 'asc' },
    })

    let totalSales = new Decimal(0)
    let totalItems = 0
    const payments = new Map() // method -> { count, total }
    const statuses = new Map() // status -> { count, total }
    const customers = new Map() // customerId -> { name, orders, total }
    let shopify = { count: 0, total: new Decimal(0) }
    let direct = { count: 0, total: new Decimal(0) }

    for (const inv of invoices) {
      const total = new Decimal(inv.grandTotal)
      totalSales = totalSales.plus(total)
      totalItems += inv.items.reduce((sum, it) => sum + it.quantity, 0)

      const pay = inv.paymentMethod || 'OTHER'
      const payAgg = payments.get(pay) || { count: 0, total: new Decimal(0) }
      payAgg.count += 1
      payAgg.total = payAgg.total.plus(total)
      payments.set(pay, payAgg)

      const st = inv.status || 'DRAFT'
      const stAgg = statuses.get(st) || { count: 0, total: new Decimal(0) }
      stAgg.count += 1
      stAgg.total = stAgg.total.plus(total)
      statuses.set(st, stAgg)

      if (inv.customer) {
        const custId = inv.customer.id
        const custAgg = customers.get(custId) || { name: inv.customer.name, orders: 0, total: new Decimal(0) }
        custAgg.orders += 1
        custAgg.total = custAgg.total.plus(total)
        customers.set(custId, custAgg)
      }

      const isShopify = inv.order?.source === 'SHOPIFY'
      if (isShopify) {
        shopify.count += 1
        shopify.total = shopify.total.plus(total)
      } else {
        direct.count += 1
        direct.total = direct.total.plus(total)
      }
    }

    const count = invoices.length
    const avgOrderValue = count > 0 ? totalSales.div(count) : new Decimal(0)

    // Trend: bucket revenue per day and adapt the granularity to the range span.
    const from = filters.dateFrom ? new Date(filters.dateFrom) : invoices[0]?.date || new Date()
    const to = filters.dateTo ? new Date(filters.dateTo) : invoices.at(-1)?.date || from
    const spanDays = Math.max(1, Math.round((to - from) / 86400000) + 1)
    const stepDays = spanDays <= 31 ? 1 : spanDays <= 180 ? 7 : 30
    const granularity = stepDays === 1 ? 'daily' : stepDays === 7 ? 'weekly' : 'monthly'

    const pointKey = (d) => {
      const t = new Date(d)
      const start = new Date(Date.UTC(0, 0, 1))
      const day = Math.floor((t - start) / 86400000)
      return Math.floor(day / stepDays)
    }
    const bucketStart = (key) => {
      const b = new Date(Date.UTC(0, 0, 1))
      b.setUTCDate(1 + key * stepDays)
      return b
    }

    const buckets = new Map()
    for (const inv of invoices) {
      const key = pointKey(inv.date)
      const agg = buckets.get(key) || { revenue: new Decimal(0), orders: 0 }
      agg.revenue = agg.revenue.plus(new Decimal(inv.grandTotal))
      agg.orders += 1
      buckets.set(key, agg)
    }

    const points = []
    const firstKey = pointKey(from)
    const lastKey = pointKey(to)
    for (let key = firstKey; key <= lastKey; key++) {
      const start = bucketStart(key)
      const label =
        stepDays >= 30
          ? start.toISOString().slice(0, 7)
          : start.toISOString().slice(0, 10)
      const agg = buckets.get(key)
      points.push({
        label,
        revenue: Number((agg?.revenue || new Decimal(0)).toDecimalPlaces(2)),
        orders: agg?.orders || 0,
      })
    }

    const toSeries = (map) =>
      [...map.entries()]
        .map(([label, agg]) => ({
          label,
          count: agg.count,
          total: Number(agg.total.toDecimalPlaces(2)),
        }))
        .sort((a, b) => b.total - a.total)

    const topCustomers = [...customers.entries()]
      .map(([customerId, agg]) => ({
        customerId,
        name: agg.name,
        orders: agg.orders,
        total: Number(agg.total.toDecimalPlaces(2)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    return {
      kpis: {
        totalSales: Number(totalSales.toDecimalPlaces(2)),
        orderCount: count,
        avgOrderValue: Number(avgOrderValue.toDecimalPlaces(2)),
        totalItems,
      },
      trend: { granularity, points },
      payments: toSeries(payments),
      statuses: toSeries(statuses),
      topCustomers,
      source: {
        shopify: { count: shopify.count, total: Number(shopify.total.toDecimalPlaces(2)) },
        direct: { count: direct.count, total: Number(direct.total.toDecimalPlaces(2)) },
      },
    }
  },

  async getById(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        salesperson: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, sku: true } } } },
        payments: true,
      },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found')
    return invoice
  },

  async findOrCreateCustomer(data) {
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } })
    if (existing) {
      // Update details in case anything changed
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          email: data.email,
          address: data.address,
          ...(data.gstin !== undefined ? { gstin: data.gstin } : {}),
        },
      })
    }
    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        ...(data.gstin !== undefined ? { gstin: data.gstin } : {}),
      },
    })
  },

  // Shared by create and update: loads products + current silver rate, builds the
  // line-item snapshot and running totals using exact Decimal maths.
  async _buildItemsData(items) {
    const ids = items.map((i) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { inventory: true } })
    const productMap = new Map(products.map((p) => [p.id, p]))
    const silverRate = (await prisma.metalRate.findUnique({ where: { metal: 'silver' } }))?.rate ?? 0

    let subtotal = new Decimal(0)
    let gstTotal = new Decimal(0)
    let finalTotal = new Decimal(0)
    let totalWeight = new Decimal(0)
    let totalMaking = new Decimal(0)

    const itemsData = []
    for (const line of items) {
      const product = productMap.get(line.productId)
      if (!product) throw new ApiError(404, `Product id ${line.productId} not found`)
      if ((product.inventory?.quantity ?? 0) < line.quantity) {
        throw new ApiError(400, `Not enough stock for ${product.name}. Available: ${product.inventory?.quantity ?? 0}`)
      }

      const qty = new Decimal(line.quantity)
      // Per-unit prices: line overrides (sent when editing so original sale
      // prices are preserved) take precedence over the product's current rate.
      const unitBase =
        line.baseAmount !== undefined ? new Decimal(line.baseAmount) : new Decimal(product.baseAmount)
      const unitGst = line.gstAmount !== undefined ? new Decimal(line.gstAmount) : new Decimal(product.gstAmount)
      const unitFinal =
        line.sellingPrice !== undefined ? new Decimal(line.sellingPrice) : new Decimal(product.sellingPrice)

      const baseAmount = unitBase.mul(qty)
      const gstAmount = unitGst.mul(qty)
      const finalAmount = unitFinal.mul(qty)

      subtotal = subtotal.plus(baseAmount)
      gstTotal = gstTotal.plus(gstAmount)
      finalTotal = finalTotal.plus(finalAmount)
      totalWeight = totalWeight.plus(new Decimal(product.weight).mul(qty))
      totalMaking = totalMaking.plus(new Decimal(product.makingCharge).mul(product.weight).mul(qty))

      itemsData.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: line.quantity,
        weight: product.weight,
        makingCharge: product.makingCharge,
        silverRate,
        baseAmount: baseAmount.toDecimalPlaces(2),
        gstAmount: gstAmount.toDecimalPlaces(2),
        finalAmount: finalAmount.toDecimalPlaces(2),
      })
    }

    return { itemsData, subtotal, gstTotal, finalTotal, totalWeight, totalMaking, productMap }
  },

  // POST /api/invoices — creates invoice, reduces stock, records payment (all atomically)
  async create(data, userId) {
    const customer = await this.findOrCreateCustomer(data.customer)

    // Next invoice number: INV-0001, INV-0002, ...
    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'invoicePrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'INV-'
    const last = await prisma.invoice.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const invoiceNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    const { itemsData, subtotal, gstTotal, finalTotal, totalWeight, totalMaking, productMap } =
      await this._buildItemsData(data.items)

    const discount = new Decimal(data.discount || 0)
    if (discount.greaterThan(finalTotal)) {
      throw new ApiError(400, 'Discount cannot exceed the total')
    }
    // Header always equals the sum of the line finalAmounts (selling price × qty).
    const grandTotal = finalTotal.minus(discount)
    const isPaid = Boolean(data.paymentMethod)

    const invoice = await prisma.$transaction(
      async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          date: new Date(),
          paymentMethod: data.paymentMethod,
          salespersonId: userId,
          status: isPaid ? 'PAID' : 'DRAFT',
          subtotal: subtotal.toDecimalPlaces(2),
          discount: discount.toDecimalPlaces(2),
          gstTotal: gstTotal.toDecimalPlaces(2),
          grandTotal: grandTotal.toDecimalPlaces(2),
          totalWeight: totalWeight.toDecimalPlaces(3),
          totalMakingCharge: totalMaking.toDecimalPlaces(2),
          items: { create: itemsData },
        },
      })

      // Reduce stock + write SALE ledger entries — same transaction as the invoice
      for (const line of itemsData) {
        await inventoryService.applyInTx(tx, line.productId, -line.quantity, 'SALE', userId, null, invoiceNumber)
      }

      // Always record a linked payment so the dashboard Payment Status
      // card stays consistent with Period Sales. PAID when a method was
      // provided, otherwise a PENDING payment marked for later collection.
      await tx.payment.create({
        data: {
          invoiceId: inv.id,
          customerId: customer.id,
          amount: grandTotal.toDecimalPlaces(2),
          method: isPaid ? data.paymentMethod : 'OTHER',
          status: isPaid ? 'PAID' : 'PENDING',
        },
      })

      return inv
      },
      { timeout: 60000 }
    )

    await prisma.auditLog.create({
      data: { userId, action: 'INVOICE_CREATED', entity: 'Invoice', entityId: invoice.id },
    })

    // Create notification for new invoice
    const invoiceData = await this.getById(invoice.id)
    const custName = invoiceData.customer?.name || 'Walk-in'
    await notificationService.createForAll({
      type: 'INVOICE_CREATED',
      title: 'New Invoice',
      message: `Invoice ${invoiceData.invoiceNumber} for ${custName} — ₹${Number(invoiceData.grandTotal).toLocaleString('en-IN')}`,
    })

    // Check for low stock after invoice
    const lowStockProducts = []
    for (const line of itemsData) {
      const product = productMap.get(line.productId)
      if (product && (product.inventory?.quantity ?? 0) <= product.lowStockThreshold) {
        lowStockProducts.push(product)
      }
    }
    if (lowStockProducts.length > 0) {
      await notificationService.createForAll({
        type: 'LOW_STOCK',
        title: 'Low Stock Alert',
        message: lowStockProducts.map((p) => `${p.name} (${p.sku}) — ${p.inventory?.quantity ?? 0} units left`).join('\n'),
      })
    }

    return this.getById(invoice.id)
  },

  async update(id, data, userId) {
    const existing = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    })
    if (!existing) throw new ApiError(404, 'Invoice not found')

    // Full line-item replacement: recompute totals at current prices/rates.
    let itemsData = null
    let rebuiltTotals = null
    const discount = new Decimal(data.discount ?? existing.discount ?? 0)
    if (data.items && data.items.length > 0) {
      const built = await this._buildItemsData(data.items)
      itemsData = built.itemsData
      if (discount.greaterThan(built.finalTotal)) {
        throw new ApiError(400, 'Discount cannot exceed the total')
      }
      rebuiltTotals = {
        subtotal: built.subtotal,
        gstTotal: built.gstTotal,
        totalWeight: built.totalWeight,
        totalMaking: built.totalMaking,
        grandTotal: built.finalTotal.minus(discount),
      }
    }

    // If a payment method was collected, the invoice is effectively PAID (mirrors create).
    const effectiveStatus = data.status || (data.paymentMethod ? 'PAID' : existing.status)
    const effectivePayMethod = data.paymentMethod || existing.paymentMethod || 'OTHER'
    const payStatus = effectiveStatus === 'DRAFT' ? 'PENDING' : 'PAID'

    const result = await prisma.$transaction(
      async (tx) => {
        const patch = {}
        if (data.status) patch.status = data.status
        if (data.paymentMethod) patch.paymentMethod = data.paymentMethod
        if (data.customerId !== undefined) patch.customerId = data.customerId

        if (rebuiltTotals !== null) {
          patch.subtotal = rebuiltTotals.subtotal.toDecimalPlaces(2)
          patch.discount = discount.toDecimalPlaces(2)
          patch.gstTotal = rebuiltTotals.gstTotal.toDecimalPlaces(2)
          patch.grandTotal = rebuiltTotals.grandTotal.toDecimalPlaces(2)
          patch.totalWeight = rebuiltTotals.totalWeight.toDecimalPlaces(3)
          patch.totalMakingCharge = rebuiltTotals.totalMaking.toDecimalPlaces(2)
        }

        let invoice
        if (itemsData !== null) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } })
          invoice = await tx.invoice.update({
            where: { id: existing.id },
            data: { ...patch, items: { create: itemsData } },
          })
        } else if (Object.keys(patch).length > 0) {
          invoice = await tx.invoice.update({ where: { id: existing.id }, data: patch })
        } else {
          invoice = existing
        }

        // Keep the linked customer's contact details in sync with the form
        if (data.customer && existing.customerId) {
          const custPatch = {}
          if (data.customer.name !== undefined) custPatch.name = data.customer.name
          if (data.customer.phone !== undefined) custPatch.phone = data.customer.phone
          if (data.customer.email !== undefined) custPatch.email = data.customer.email
          if (data.customer.address !== undefined) custPatch.address = data.customer.address
          if (data.customer.gstin !== undefined) custPatch.gstin = data.customer.gstin
          if (Object.keys(custPatch).length > 0) {
            await tx.customer.update({ where: { id: existing.customerId }, data: custPatch })
          }
        }

        // Reconcile stock: return what was removed, deduct what was added.
        if (itemsData !== null) {
          const oldQty = new Map(existing.items.map((i) => [i.productId, i.quantity]))
          const newQty = new Map(itemsData.map((i) => [i.productId, i.quantity]))
          const productIds = new Set([...oldQty.keys(), ...newQty.keys()])
          for (const productId of productIds) {
            const oldCount = oldQty.get(productId) ?? 0
            const newCount = newQty.get(productId) ?? 0
            const delta = newCount - oldCount
            if (delta !== 0) {
              await inventoryService.applyInTx(
                tx,
                productId,
                -delta,
                delta > 0 ? 'SALE' : 'RETURN',
                userId,
                'Invoice edited',
                existing.invoiceNumber
              )
            }
          }
        }

        // Keep the linked order's items + total in step with the invoice so the
        // Orders list never shows a stale amount after an invoice edit. The order
        // total stays the sum of its line totals (no discount field on orders).
        if (itemsData !== null && existing.orderId) {
          const orderItemsData = itemsData.map((it) => ({
            productId: it.productId,
            sku: it.sku,
            name: it.name,
            quantity: it.quantity,
            unitPrice: new Decimal(it.finalAmount).dividedBy(new Decimal(it.quantity)).toDecimalPlaces(2),
            lineTotal: it.finalAmount,
            weight: it.weight,
            makingCharge: it.makingCharge,
            silverRate: it.silverRate,
            gstAmount: it.gstAmount,
          }))
          const orderLineTotal = itemsData.reduce(
            (sum, it) => sum.plus(new Decimal(it.finalAmount)),
            new Decimal(0)
          )
          await tx.orderItem.deleteMany({ where: { orderId: existing.orderId } })
          await tx.order.update({
            where: { id: existing.orderId },
            data: { totalAmount: orderLineTotal.toDecimalPlaces(2), items: { create: orderItemsData } },
          })
        }

        // Keep the linked payment record consistent with the new totals / method / status.
        if (data.paymentMethod || data.status || itemsData !== null) {
          const payPatch = { method: effectivePayMethod, status: payStatus }
          if (rebuiltTotals !== null) payPatch.amount = rebuiltTotals.grandTotal.toDecimalPlaces(2)
          await tx.payment.updateMany({ where: { invoiceId: existing.id }, data: payPatch })
        }

        return invoice
      },
      { timeout: 60000 }
    )

    await prisma.auditLog.create({
      data: { userId, action: 'INVOICE_UPDATED', entity: 'Invoice', entityId: result.id },
    })

    return this.getById(result.id)
  },
}

module.exports = invoiceService
