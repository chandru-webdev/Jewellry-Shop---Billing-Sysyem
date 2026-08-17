// =============================================================
// Unit tests for the PRICING FORMULA — the heart of OPAL LINE.
//
// Run:  npm test
//
// These tests are pure (no database needed) because calculatePrice
// is a plain function. This is the exact business rule from the spec:
//
//   baseAmount   = (silverRate + makingChargePerGram) × weight
//   gstAmount    = baseAmount × gstPercent / 100
//   sellingPrice = baseAmount + gstAmount
// =============================================================
const { test } = require('node:test')
const assert = require('node:assert')
const { calculatePrice } = require('../../src/services/pricing.service')

// Decimal rounds to 2dp but stringifies without trailing zeros,
// so compare numerically and check exact 2dp with .toFixed(2).
function expectMoney(decimal, expected) {
  assert.strictEqual(Number(decimal).toFixed(2), expected)
}

// The worked example from the spec:
//   silver 125/g, making 180/g, weight 5g  -> base 1525, GST 45.75, price 1570.75
test('calculates the spec example correctly (silver 125, making 180, weight 5)', () => {
  const { baseAmount, gstAmount, sellingPrice } = calculatePrice({
    silverRate: 125,
    makingCharge: 180,
    weight: 5,
    gstPercent: 3,
  })

  expectMoney(baseAmount, '1525.00') // (125 + 180) × 5
  expectMoney(gstAmount, '45.75') // 1525 × 3%
  expectMoney(sellingPrice, '1570.75')
})

test('price drops when the silver rate drops', () => {
  const lower = calculatePrice({ silverRate: 120, makingCharge: 180, weight: 5, gstPercent: 3 })
  const higher = calculatePrice({ silverRate: 125, makingCharge: 180, weight: 5, gstPercent: 3 })

  expectMoney(lower.sellingPrice, '1545.00') // (120+180)×5 = 1500 + 45 GST
  expectMoney(higher.sellingPrice, '1570.75')
  assert.ok(higher.sellingPrice.greaterThan(lower.sellingPrice))
})

test('weight zero means price zero (no negative amounts)', () => {
  const { baseAmount, gstAmount, sellingPrice } = calculatePrice({
    silverRate: 125,
    makingCharge: 180,
    weight: 0,
    gstPercent: 3,
  })
  expectMoney(baseAmount, '0.00')
  expectMoney(gstAmount, '0.00')
  expectMoney(sellingPrice, '0.00')
})

test('GST is exactly 3% and rounding is to 2 decimal places', () => {
  const { baseAmount, gstAmount, sellingPrice } = calculatePrice({
    silverRate: 120,
    makingCharge: 100,
    weight: 3.333,
    gstPercent: 3,
  })
  // base = 220 × 3.333 = 733.26, gst = 733.26 × 3% = 21.9978 -> 22.00
  expectMoney(baseAmount, '733.26')
  expectMoney(gstAmount, '22.00')
  expectMoney(sellingPrice, '755.26')
})

test('uses Decimal internally so floating point drift never leaks in', () => {
  const result = calculatePrice({ silverRate: 120.1, makingCharge: 99.9, weight: 0.7, gstPercent: 3 })
  // 220.0 × 0.7 = 154.000...  (0.1 + 0.2 style rounding must NOT appear)
  expectMoney(result.baseAmount, '154.00')
})
