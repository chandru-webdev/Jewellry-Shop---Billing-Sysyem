const { Prisma } = require('@prisma/client')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const Decimal = Prisma.Decimal

// =============================================================
// THE OPAL LINE PRICING FORMULA (backend only — never in React)
//
// baseAmount   = (silverRate + makingChargePerGram) * weight
// gstAmount    = baseAmount * gstPercent / 100
// sellingPrice = baseAmount + gstAmount
//
// Example: silver 125, making 180, weight 5
//   base = (125 + 180) * 5 = 1525
//   gst  = 1525 * 0.03     = 45.75
//   price= 1525 + 45.75    = 1570.75
// =============================================================
function calculatePrice({ silverRate, weight, makingCharge, gstPercent }) {
  const perGram = new Decimal(silverRate).plus(makingCharge)
  const baseAmount = perGram.mul(weight)
  const gstAmount = baseAmount.mul(gstPercent).div(100)
  const sellingPrice = baseAmount.plus(gstAmount)

  return {
    baseAmount: baseAmount.toDecimalPlaces(2),
    gstAmount: gstAmount.toDecimalPlaces(2),
    sellingPrice: sellingPrice.toDecimalPlaces(2),
  }
}

// Reads the CURRENT silver rate (stored centrally in MetalRate).
async function getSilverRate() {
  const rate = await prisma.metalRate.findUnique({ where: { metal: 'silver' } })
  if (!rate) {
    throw new ApiError(500, 'Silver rate is not set. Please set it in Metal Rates first.')
  }
  return rate.rate
}

// ---------- PRICING ENGINE ----------
// Used when the admin changes the silver rate.
// Shows what WOULD change (preview) and applies the change (update).

// Preview: calculate what prices WOULD be at a new rate, WITHOUT saving.
async function previewRecalculation(newRate) {
  const products = await prisma.product.findMany({ where: { isActive: true } })

  const sample = products.slice(0, 10).map((p) => {
    const price = calculatePrice({
      silverRate: newRate,
      weight: p.weight,
      makingCharge: p.makingCharge,
      gstPercent: p.gstPercent,
    })
    return {
      sku: p.sku,
      name: p.name,
      oldPrice: p.sellingPrice,
      newPrice: price.sellingPrice,
    }
  })

  return {
    affectedCount: products.length,
    sample,
  }
}

// Recalculate every active product at a new rate and SAVE the new prices.
async function recalculateAllProducts(newRate) {
  const products = await prisma.product.findMany({ where: { isActive: true } })

  const updates = products.map((p) => {
    const price = calculatePrice({
      silverRate: newRate,
      weight: p.weight,
      makingCharge: p.makingCharge,
      gstPercent: p.gstPercent,
    })
    return prisma.product.update({
      where: { id: p.id },
      data: {
        baseAmount: price.baseAmount,
        gstAmount: price.gstAmount,
        sellingPrice: price.sellingPrice,
      },
    })
  })

  // Save all new prices in ONE database transaction.
  // (The Shopify price push hooks in here in Phase 18.)
  // The timeout is raised because large catalogs can exceed Prisma's
  // default 5s transaction window.
  if (updates.length > 0) {
    await prisma.$transaction(updates, { timeout: 120000 })
  }

  return products.length
}

module.exports = { calculatePrice, getSilverRate, previewRecalculation, recalculateAllProducts }
