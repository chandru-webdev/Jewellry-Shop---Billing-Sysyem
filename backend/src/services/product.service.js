const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { calculatePrice, getSilverRate } = require('./pricing.service')
const shopifyService = require('./shopify.service')
const { escapeLike } = require('../utils/sanitizeSearch')

const Decimal = Prisma.Decimal

// Returns a positive Decimal from a raw value ('' / null / NaN -> fallback).
function makeDecimal(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback instanceof Decimal ? fallback : new Decimal(fallback ?? 0)
  const n = Number(value)
  if (Number.isNaN(n)) return fallback instanceof Decimal ? fallback : new Decimal(fallback ?? 0)
  return new Decimal(n)
}

function clampZero(d) {
  return d.gte(0) ? d : new Decimal(0)
}

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
      include: { category: true, inventory: true, collection: true, supplier: true },
      orderBy: { id: 'desc' },
    })
  },

  // GET /api/products/:id
  async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { category: true, inventory: true, collection: true, supplier: true },
    })
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  },

  // POST /api/products  — price is calculated by the backend, never sent by the client.
  // Pricing uses NET weight (gross - stone) and the product's silver rate.
  async create(data, userId) {
    const sku = String(data.sku || '').trim()
    const duplicate = await prisma.product.findUnique({ where: { sku } })
    if (duplicate) throw new ApiError(400, `SKU "${sku}" already exists`)

    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } })
      if (existingBarcode) throw new ApiError(400, `Barcode "${data.barcode}" already in use`)
    }

    const grossWeight = makeDecimal(data.grossWeight, 0)
    const stoneWeight = makeDecimal(data.stoneWeight, 0)
    const netSupplied = data.netWeight !== undefined && data.netWeight !== null && data.netWeight !== ''
    const netWeight = netSupplied
      ? makeDecimal(data.netWeight, 0)
      : clampZero(grossWeight.minus(stoneWeight))

    const makingCharge = makeDecimal(data.makingCharge, 20)
    const gstPercent = makeDecimal(data.gstPercent, 3)
    const hasOverride = data.sellingPrice !== undefined && data.sellingPrice !== null && data.sellingPrice !== ''

    const silverRate = data.silverRateUsed !== undefined && data.silverRateUsed !== null && data.silverRateUsed !== ''
      ? new Decimal(data.silverRateUsed)
      : new Decimal(await getSilverRate())

    const price = calculatePrice({ silverRate, weight: netWeight, makingCharge, gstPercent })

    const product = await prisma.product.create({
      data: {
        sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        barcode: data.barcode || null,
        collectionId: data.collectionId ? Number(data.collectionId) : null,
        supplierId: data.supplierId ? Number(data.supplierId) : null,
        purity: makeDecimal(data.purity, 92.5),
        grossWeight,
        stoneWeight,
        netWeight,
        weight: netWeight,
        silverRateUsed: silverRate,
        makingCharge,
        gstPercent,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        baseAmount: price.baseAmount,
        gstAmount: price.gstAmount,
        sellingPrice: hasOverride ? makeDecimal(data.sellingPrice, price.sellingPrice) : price.sellingPrice,
        compareAtPrice: data.compareAtPrice ? makeDecimal(data.compareAtPrice, null) : null,
        costPrice: data.costPrice ? makeDecimal(data.costPrice, null) : null,
        trackInventory: data.trackInventory !== false,
        pushToShopify: data.pushToShopify !== false,
        shopifyVendor: data.shopifyVendor || null,
        shopifyProductType: data.shopifyProductType || null,
        shopifyTags: data.shopifyTags || null,
        shopifyImageUrl: data.shopifyImageUrl || null,
        inventory: { create: { quantity: data.initialStock || 0 } },
      },
      include: { category: true, inventory: true, collection: true, supplier: true },
    })

    // Push new product to Shopify (unless it's a billing-software-only product).
    if (product.pushToShopify && product.isActive) {
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
      } catch (err) {
        // Still saved locally — flag for manual sync retry later.
        product.shopifyError = (err && err.message) || 'Shopify push failed'
      }
    }

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id },
    })

    return product
  },

  // PUT /api/products/:id  — recalculates the price if weight/making/gst changed.
  // Pricing uses NET weight (gross - stone) and the product's silver rate.
  async update(id, data, userId) {
    const existing = await this.getById(id)

    if (data.sku && data.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
      if (duplicate) throw new ApiError(400, `SKU "${data.sku}" already exists`)
    }

    if (data.barcode && data.barcode !== existing.barcode) {
      const dup = await prisma.product.findUnique({ where: { barcode: data.barcode } })
      if (dup && dup.id !== existing.id) throw new ApiError(400, `Barcode "${data.barcode}" already in use`)
    }

    const supplied = (v) => v !== undefined && v !== null && v !== ''

    const grossWeight = makeDecimal(supplied(data.grossWeight) ? data.grossWeight : existing.grossWeight ?? existing.weight, 0)
    const stoneWeight = makeDecimal(supplied(data.stoneWeight) ? data.stoneWeight : existing.stoneWeight ?? 0, 0)

    // Legacy weight inline-edit acts as a net-weight override for backward compat.
    let netWeight
    if (supplied(data.netWeight)) netWeight = makeDecimal(data.netWeight, 0)
    else if (supplied(data.weight)) netWeight = makeDecimal(data.weight, 0)
    else netWeight = clampZero(grossWeight.minus(stoneWeight))

    const makingCharge = supplied(data.makingCharge) ? makeDecimal(data.makingCharge, 0) : new Decimal(existing.makingCharge)
    const gstPercent = supplied(data.gstPercent) ? makeDecimal(data.gstPercent, 0) : new Decimal(existing.gstPercent)

    const silverRate = supplied(data.silverRateUsed)
      ? new Decimal(data.silverRateUsed)
      : existing.silverRateUsed
        ? new Decimal(existing.silverRateUsed)
        : new Decimal(await getSilverRate())

    const price = calculatePrice({ silverRate, weight: netWeight, makingCharge, gstPercent })

    const hasOverride = supplied(data.sellingPrice)
    const { initialStock, updateStock, sellingPrice: givenSelling, ...restData } = data

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...restData,
        collectionId: supplied(data.collectionId) ? Number(data.collectionId) : existing.collectionId,
        supplierId: supplied(data.supplierId) ? Number(data.supplierId) : existing.supplierId,
        purity: supplied(data.purity) ? makeDecimal(data.purity, 0) : existing.purity,
        grossWeight,
        stoneWeight,
        netWeight,
        weight: netWeight,
        silverRateUsed: silverRate,
        makingCharge,
        gstPercent,
        baseAmount: price.baseAmount,
        gstAmount: price.gstAmount,
        sellingPrice: hasOverride ? new Decimal(givenSelling) : price.sellingPrice,
        ...(supplied(data.compareAtPrice)
          ? { compareAtPrice: makeDecimal(data.compareAtPrice, null) }
          : data.compareAtPrice === ''
            ? { compareAtPrice: null }
            : {}),
      },
      include: { category: true, inventory: true, collection: true, supplier: true },
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
    if (product.shopifyVariantId && (data.weight !== undefined || data.netWeight !== undefined || data.grossWeight !== undefined || data.stoneWeight !== undefined || data.makingCharge !== undefined || data.gstPercent !== undefined || data.sellingPrice !== undefined || data.compareAtPrice !== undefined || isActiveChanged)) {
      shopifyService.updateProductOnShopify(product).catch(() => {})
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
      if (product.shopifyInventoryItemId && product.trackInventory !== false) {
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
      shopifyService.updateProductOnShopify({ ...existing, isActive: false }).catch(() => {})
    }

    await prisma.auditLog.create({
      data: { userId, action: 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: product.id },
    })

    return product
  },
}

module.exports = productService
