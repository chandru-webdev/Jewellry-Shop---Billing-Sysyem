const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { calculatePrice, getSilverRate } = require('./pricing.service')
const shopifyService = require('./shopify.service')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

const productService = {
  // GET /api/products  — optional filters: ?search=, ?categoryId=, ?isActive=
  async list(filters = {}) {
    const where = {}

    if (filters.search) {
      const q = escapeLike(filters.search)
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (filters.categoryId) where.categoryId = Number(filters.categoryId)
    if (filters.isActive === 'true' || filters.isActive === 'false') {
      where.isActive = filters.isActive === 'true'
    }

    return prisma.product.findMany({
      where,
      include: { category: true, inventory: true },
      orderBy: { id: 'desc' },
    })
  },

  // GET /api/products/:id
  async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { category: true, inventory: true },
    })
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  },

  // POST /api/products  — price is calculated by the backend, never sent by the client
  async create(data, userId) {
    const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (duplicate) throw new ApiError(400, `SKU "${data.sku}" already exists`)

    const silverRate = await getSilverRate()
    const price = calculatePrice({
      silverRate,
      weight: data.weight,
      makingCharge: data.makingCharge,
      gstPercent: data.gstPercent || 3,
    })

    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        weight: data.weight,
        makingCharge: data.makingCharge,
        gstPercent: data.gstPercent || 3,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        ...price,
        inventory: { create: { quantity: data.initialStock || 0 } },
      },
      include: { category: true, inventory: true },
    })

    // Push new product to Shopify
    if (product.isActive) {
      try {
        const ids = await shopifyService.createProductOnShopify(product)
        await prisma.product.update({
          where: { id: product.id },
          data: {
            shopifyProductId: ids.shopifyProductId,
            shopifyVariantId: ids.shopifyVariantId,
            shopifyInventoryItemId: ids.shopifyInventoryItemId,
          },
        })
        product.shopifyProductId = ids.shopifyProductId
        product.shopifyVariantId = ids.shopifyVariantId
        product.shopifyInventoryItemId = ids.shopifyInventoryItemId
      } catch (_) {}
    }

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id },
    })

    return product
  },

  // PUT /api/products/:id  — recalculates the price if weight/making/gst changed
  async update(id, data, userId) {
    const existing = await this.getById(id)

    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
      if (duplicate) throw new ApiError(400, `SKU "${data.sku}" already exists`)
    }

    const weight = data.weight ?? existing.weight
    const makingCharge = data.makingCharge ?? existing.makingCharge
    const gstPercent = data.gstPercent ?? existing.gstPercent

    // Recalculate using the CURRENT silver rate
    const silverRate = await getSilverRate()
    const price = calculatePrice({ silverRate, weight, makingCharge, gstPercent })

    const { initialStock, updateStock, ...restData } = data

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...restData,
        ...price,
      },
      include: { category: true, inventory: true },
    })

    // Record price history if selling price changed
    const oldSelling = new Decimal(existing.sellingPrice)
    const newSelling = new Decimal(product.sellingPrice)
    if (!oldSelling.equals(newSelling)) {
      const changeAmount = newSelling.minus(oldSelling)
      const changePercentage = oldSelling.equals(0)
        ? 0
        : changeAmount.div(oldSelling).mul(100).toDecimalPlaces(4)

      let reason = 'manual_price_update'
      if (data.makingCharge !== undefined && data.makingCharge !== Number(existing.makingCharge)) {
        reason = 'making_charge_change'
      } else if (data.weight !== undefined && data.weight !== Number(existing.weight)) {
        reason = 'manual_price_update'
      } else if (data.gstPercent !== undefined && data.gstPercent !== Number(existing.gstPercent)) {
        reason = 'manual_price_update'
      }

      await prisma.productPriceHistory.create({
        data: {
          productId: product.id,
          priceType: 'SELLING',
          oldPrice: oldSelling.toDecimalPlaces(2),
          newPrice: newSelling.toDecimalPlaces(2),
          changeAmount: changeAmount.toDecimalPlaces(2),
          changePercentage,
          reason,
          notes: data.priceChangeNotes || null,
          changedById: userId,
        },
      })
    }

    // Push to Shopify if price-relevant fields changed OR status changed
    const isActiveChanged = data.isActive !== undefined && data.isActive !== existing.isActive
    if (product.shopifyVariantId && (data.weight !== undefined || data.makingCharge !== undefined || data.gstPercent !== undefined || isActiveChanged)) {
      shopifyService.updateProductOnShopify({
        shopifyProductId: product.shopifyProductId,
        shopifyVariantId: product.shopifyVariantId,
        shopifyInventoryItemId: product.shopifyInventoryItemId,
        name: product.name,
        category: product.category,
        description: product.description,
        isActive: product.isActive,
        sellingPrice: product.sellingPrice,
        sku: product.sku,
        inventory: product.inventory,
        weight: product.weight,
      }).catch(() => {})
    }

    // Handle stock update via inventory
    if (updateStock && initialStock !== undefined) {
      const newQty = Number(initialStock)
      if (existing.inventory) {
        await prisma.inventory.update({
          where: { id: existing.inventory.id },
          data: { quantity: newQty },
        })
      } else {
        await prisma.inventory.create({
          data: { productId: product.id, quantity: newQty },
        })
      }
      // Push to Shopify
      if (product.shopifyInventoryItemId) {
        shopifyService.setInventoryLevel(Number(product.shopifyInventoryItemId), newQty).catch(() => {})
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: isActiveChanged && data.isActive ? 'PRODUCT_ACTIVATED' : 'PRODUCT_UPDATED',
        entity: 'Product',
        entityId: product.id,
      },
    })

    return product
  },

  // DELETE /api/products/:id  — soft delete: just marks inactive
  async remove(id, userId) {
    const existing = await this.getById(id)
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { isActive: false },
    })

    // Sync deactivation to Shopify (set status to 'draft')
    if (existing.shopifyProductId) {
      shopifyService.updateProductOnShopify({
        shopifyProductId: existing.shopifyProductId,
        shopifyVariantId: existing.shopifyVariantId,
        shopifyInventoryItemId: existing.shopifyInventoryItemId,
        name: existing.name,
        category: existing.category,
        description: existing.description,
        isActive: false,
        sellingPrice: existing.sellingPrice,
        sku: existing.sku,
        inventory: existing.inventory,
        weight: existing.weight,
      }).catch(() => {})
    }

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: product.id },
    })

    return product
  },
}

module.exports = productService
