const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const inventoryService = require('./inventory.service')
const notificationService = require('./notification.service')

const Decimal = Prisma.Decimal

// Which status changes are allowed. Everything moves forward; CANCELLED / REFUNDED are terminal.
const ALLOWED_TRANSITIONS = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLED', 'CANCELLED', 'REFUNDED'],
  FULFILLED: ['CANCELLED', 'REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

// Stock must be returned to the shelves when an order is cancelled or refunded.
const RESTOCK_STATUSES = ['CANCELLED', 'REFUNDED']

function posOrderNumber(lastId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `POS-${date}-${String((lastId ?? 0) + 1).padStart(3, '0')}`
}

const orderService = {
  async list(filters = {}) {
    const where = {}
    if (filters.status) where.status = filters.status
    if (filters.source) where.source = filters.source
    if (filters.customerId) where.customerId = Number(filters.customerId)

    return prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        _count: { select: { items: true } },
      },
      orderBy: { id: 'desc' },
      take: Number(filters.limit) || 50,
    })
  },

  async getById(id) {
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, sku: true } } } },
        invoice: true,
        payments: true,
      },
    })
    if (!order) throw new ApiError(404, 'Order not found')
    return order
  },

  async findOrCreateCustomer(data) {
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } })
    if (existing) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: { name: data.name, email: data.email, address: data.address },
      })
    }
    return prisma.customer.create({
      data: { name: data.name, phone: data.phone, email: data.email, address: data.address },
    })
  },

  // POST /api/orders — a POS sale. Reduces stock, records payment, and links a
  // paid order to an invoice so the billing history stays unified.
  async create(data, userId) {
    let customerId = null
    if (data.customer) {
      const customer = await this.findOrCreateCustomer(data.customer)
      customerId = customer.id
    }

    // POS order number: POS-20260101-001, POS-20260101-002, ...
    const last = await prisma.order.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const orderNumber = posOrderNumber(last?.id)

    // Snapshot the products + current silver rate
    const ids = data.items.map((i) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { inventory: true } })
    const productMap = new Map(products.map((p) => [p.id, p]))
    const silverRate = (await prisma.metalRate.findUnique({ where: { metal: 'silver' } }))?.rate ?? 0

    let subtotal = new Decimal(0)
    let gstTotal = new Decimal(0)
    let totalWeight = new Decimal(0)
    let totalMaking = new Decimal(0)

    const orderItemsData = []
    const invoiceItemsData = []
    for (const line of data.items) {
      const product = productMap.get(line.productId)
      if (!product) throw new ApiError(404, `Product id ${line.productId} not found`)
      if ((product.inventory?.quantity ?? 0) < line.quantity) {
        throw new ApiError(400, `Not enough stock for ${product.name}. Available: ${product.inventory?.quantity ?? 0}`)
      }

      const qty = new Decimal(line.quantity)
      const baseAmount = new Decimal(product.baseAmount).mul(qty)
      const gstAmount = new Decimal(product.gstAmount).mul(qty)
      const lineTotal = new Decimal(product.sellingPrice).mul(qty)

      subtotal = subtotal.plus(baseAmount)
      gstTotal = gstTotal.plus(gstAmount)
      totalWeight = totalWeight.plus(new Decimal(product.weight).mul(qty))
      totalMaking = totalMaking.plus(new Decimal(product.makingCharge).mul(product.weight).mul(qty))

      orderItemsData.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: line.quantity,
        unitPrice: product.sellingPrice,
        lineTotal: lineTotal.toDecimalPlaces(2),
        weight: product.weight,
        makingCharge: product.makingCharge,
        silverRate,
        gstAmount: gstAmount.toDecimalPlaces(2),
      })

      invoiceItemsData.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: line.quantity,
        weight: product.weight,
        makingCharge: product.makingCharge,
        silverRate,
        baseAmount: baseAmount.toDecimalPlaces(2),
        gstAmount: gstAmount.toDecimalPlaces(2),
        finalAmount: lineTotal.toDecimalPlaces(2),
      })
    }

    const totalAmount = subtotal.plus(gstTotal)
    const isPaid = Boolean(data.paymentMethod)

    // Invoice number for the linked invoice (if this order is paid)
    const prefixSetting = await prisma.setting.findUnique({ where: { key: 'invoicePrefix' } })
    const prefix = prefixSetting?.value?.trim() || 'INV-'
    const lastInvoice = await prisma.invoice.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
    const invoiceNumber = `${prefix}${String((lastInvoice?.id ?? 0) + 1).padStart(4, '0')}`

    const order = await prisma.$transaction(
      async (tx) => {
        const ord = await tx.order.create({
        data: {
          orderNumber,
          source: 'POS',
          customerId,
          status: isPaid ? 'PAID' : 'PENDING',
          totalAmount: totalAmount.toDecimalPlaces(2),
          items: { create: orderItemsData },
        },
      })

      // Reduce stock + SALE ledger entries — same transaction as the order
      for (const line of orderItemsData) {
        await inventoryService.applyInTx(tx, line.productId, -line.quantity, 'SALE', userId, null, orderNumber)
      }

      let invoiceId = null
      if (isPaid) {
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId,
            orderId: ord.id,
            date: new Date(),
            paymentMethod: data.paymentMethod,
            salespersonId: userId,
            status: 'PAID',
            subtotal: subtotal.toDecimalPlaces(2),
            discount: new Decimal(0).toDecimalPlaces(2),
            gstTotal: gstTotal.toDecimalPlaces(2),
            grandTotal: totalAmount.toDecimalPlaces(2),
            totalWeight: totalWeight.toDecimalPlaces(3),
            totalMakingCharge: totalMaking.toDecimalPlaces(2),
            items: { create: invoiceItemsData },
          },
        })
        invoiceId = inv.id

        await tx.payment.create({
          data: {
            invoiceId: inv.id,
            orderId: ord.id,
            customerId,
            amount: totalAmount.toDecimalPlaces(2),
            method: data.paymentMethod,
            status: 'PAID',
          },
        })
      }

      return { ord, invoiceId }
      },
      { timeout: 60000 }
    )

    await prisma.auditLog.create({
      data: { userId, action: 'ORDER_CREATED', entity: 'Order', entityId: order.ord.id },
    })

    // Create notification for new order
    const orderData = await this.getById(order.ord.id)
    const customerName = orderData.customer?.name || 'Walk-in'
    await notificationService.createForAll({
      type: 'ORDER_CREATED',
      title: 'New Order Created',
      message: `Order ${orderData.orderNumber} from ${customerName} — ₹${Number(orderData.totalAmount).toLocaleString('en-IN')}`,
    })

    // Check for low stock after order
    for (const line of orderItemsData) {
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

    return orderData
  },

  // PATCH /api/orders/:id/status
  async updateStatus(id, status, userId) {
    const order = await this.getById(id)
    if (order.status === status) return order

    const allowed = ALLOWED_TRANSITIONS[order.status] || []
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot change order from ${order.status} to ${status}`)
    }

    if (RESTOCK_STATUSES.includes(status)) {
      // Put the items back on the shelves
      await prisma.$transaction(
        async (tx) => {
          for (const item of order.items) {
            await inventoryService.applyInTx(tx, item.productId, item.quantity, 'RETURN', userId, null, order.orderNumber)
          }
          await tx.order.update({ where: { id: order.id }, data: { status } })
          if (order.invoice) {
            await tx.invoice.update({ where: { id: order.invoice.id }, data: { status: 'VOID' } })
          }
        },
        { timeout: 60000 }
      )
    } else {
      await prisma.order.update({ where: { id: order.id }, data: { status } })
    }

    await prisma.auditLog.create({
      data: { userId, action: 'ORDER_STATUS_CHANGED', entity: 'Order', entityId: order.id, metadata: { status } },
    })

    return this.getById(order.id)
  },
}

module.exports = orderService
