// =============================================================
// Unit tests for the three-tier STOCK STATUS classification.
//
// Run:  npm test
//
// The exact boundary rules are the heart of the "low stock products"
// fix — a product at exactly its threshold is STILL low (warn, never
// hide), and a product at zero is OUT_OF_STOCK (reported, not dropped).
// =============================================================
const { test } = require('node:test')
const assert = require('node:assert')
const { stockStatus } = require('../../src/utils/stockStatus')

test('classifies healthy stock as IN_STOCK', () => {
  assert.strictEqual(stockStatus(6, 5), 'IN_STOCK')
  assert.strictEqual(stockStatus(99, 0), 'IN_STOCK')
  assert.strictEqual(stockStatus(50, null), 'IN_STOCK')
})

test('classifies stock at or below the threshold as LOW_STOCK', () => {
  assert.strictEqual(stockStatus(5, 5), 'LOW_STOCK')
  assert.strictEqual(stockStatus(1, 5), 'LOW_STOCK')
  assert.strictEqual(stockStatus(1, 1), 'LOW_STOCK')
})

test('classifies zero stock as OUT_OF_STOCK (reported, never hidden)', () => {
  assert.strictEqual(stockStatus(0, 5), 'OUT_OF_STOCK')
  assert.strictEqual(stockStatus(-1, 5), 'OUT_OF_STOCK')
  assert.strictEqual(stockStatus(null, 5), 'OUT_OF_STOCK')
})

test('defaults threshold to 5 when missing', () => {
  assert.strictEqual(stockStatus(5, undefined), 'LOW_STOCK')
  assert.strictEqual(stockStatus(6, undefined), 'IN_STOCK')
})

test('treats the single-available-item edge case as LOW_STOCK, not hidden', () => {
  // qty === 1, threshold === 1: the product still has a unit to sell.
  assert.strictEqual(stockStatus(1, 1), 'LOW_STOCK')
})