const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const inventoryService = require('./inventory.service')
const notificationService = require('./notification.service')

const Decimal = Prisma.Decimal

const invoiceService = {
  async list(filters = {}) {
    const where = {}
    if (filters.status) where.status = filters.status
    if (filters.customerId) where.customerId = Number(filters.customerId)

    return prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        salesperson: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { id: 'desc' },
      take: Number(filters.limit) || 50,
    })
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
        data: { name: data.name, email: data.email, address: data.address },
      })
    }
    return prisma.customer.create({
      data: { name: data.name, phone: data.phone, email: data.email, address: data.address },
    })
  },

  // POST /api/invoices — creates invoice, reduces stock, records payment (all atomically)
  async create(data, userId) {
    const customer = await this.findOrCreateCustomer(data.customer)

    // Next invoice number: INV-0001, INV-0002, ...
    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'invoicePrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'INV-'
    const last = await prisma.invoice.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const invoiceNumber = `${prefix}${String((last?.id ?? 0) + 1).padStart(4, '0')}`

    // Load the products and the current silver rate (for the line-item snapshot)
    const ids = data.items.map((i) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { inventory: true } })
    const productMap = new Map(products.map((p) => [p.id, p]))
    const silverRate = (await prisma.metalRate.findUnique({ where: { metal: 'silver' } }))?.rate ?? 0

    // Build line items and running totals (exact Decimal maths)
    let subtotal = new Decimal(0)
    let gstTotal = new Decimal(0)
    let totalWeight = new Decimal(0)
    let totalMaking = new Decimal(0)

    const itemsData = []
    for (const line of data.items) {
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

      if (isPaid) {
        await tx.payment.create({
          data: {
            invoiceId: inv.id,
            customerId: customer.id,
            amount: grandTotal.toDecimalPlaces(2),
            method: data.paymentMethod,
            status: 'PAID',
          },
        })
      }

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
    for (const line of itemsData) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        include: { inventory: true },
      })
      if (product && (product.inventory?.quantity ?? 0) <= product.lowStockThreshold) {
        await notificationService.createForAll({
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${product.name} (${product.sku}) has only ${product.inventory?.quantity ?? 0} units left`,
        })
      }
    }

    return this.getById(invoice.id)
  },
}

module.exports = invoiceService
