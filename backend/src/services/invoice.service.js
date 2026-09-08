const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const inventoryService = require('./inventory.service')
const notificationService = require('./notification.service')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

const invoiceService = {
   async list(filters = {}) {
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
      const baseAmount = new Decimal(product.baseAmount).mul(qty)
      const gstAmount = new Decimal(product.gstAmount).mul(qty)
      const finalAmount = new Decimal(product.sellingPrice).mul(qty)

      subtotal = subtotal.plus(baseAmount)
      gstTotal = gstTotal.plus(gstAmount)
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

    return { itemsData, subtotal, gstTotal, totalWeight, totalMaking, productMap }
  },

  // POST /api/invoices — creates invoice, reduces stock, records payment (all atomically)
  async create(data, userId) {
    const customer = await this.findOrCreateCustomer(data.customer)

    // Next invoice number: INV-0001, INV-0002, ...
    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'invoicePrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'INV-'
    const last = await prisma.invoice.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const invoiceNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    const { itemsData, subtotal, gstTotal, totalWeight, totalMaking, productMap } = await this._buildItemsData(
      data.items
    )

    const discount = new Decimal(data.discount || 0)
    if (discount.greaterThan(subtotal.plus(gstTotal))) {
      throw new ApiError(400, 'Discount cannot exceed the total')
    }
    const grandTotal = subtotal.plus(gstTotal).minus(discount)
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
      if (discount.greaterThan(built.subtotal.plus(built.gstTotal))) {
        throw new ApiError(400, 'Discount cannot exceed the total')
      }
      rebuiltTotals = {
        subtotal: built.subtotal,
        gstTotal: built.gstTotal,
        totalWeight: built.totalWeight,
        totalMaking: built.totalMaking,
        grandTotal: built.subtotal.plus(built.gstTotal).minus(discount),
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
