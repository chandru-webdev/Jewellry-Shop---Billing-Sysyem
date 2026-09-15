// Unit tests for the shared frontend stock-status helper.
// Run: node --test frontend/tests/stockStatus.test.js
import { test } from 'node:test'
import assert from 'node:assert'
import { stockStatus, stockStatusTone } from '../src/utils/stock.js'

test('classifies healthy stock as In Stock', () => {
  assert.strictEqual(stockStatus(6, 5), 'In Stock')
  assert.strictEqual(stockStatus(99, 0), 'In Stock')
  assert.strictEqual(stockStatus(50, null), 'In Stock')
})

test('classifies stock at or below the threshold as Low Stock', () => {
  assert.strictEqual(stockStatus(5, 5), 'Low Stock')
  assert.strictEqual(stockStatus(1, 5), 'Low Stock')
  assert.strictEqual(stockStatus(1, 1), 'Low Stock')
})

test('classifies zero stock as Out of Stock', () => {
  assert.strictEqual(stockStatus(0, 5), 'Out of Stock')
  assert.strictEqual(stockStatus(null, 5), 'Out of Stock')
})

test('defaults threshold to 5 when missing', () => {
  assert.strictEqual(stockStatus(5, undefined), 'Low Stock')
  assert.strictEqual(stockStatus(6, undefined), 'In Stock')
})

test('provides tones for every status label', () => {
  assert.strictEqual(stockStatusTone['In Stock'], 'green')
  assert.strictEqual(stockStatusTone['Low Stock'], 'orange')
  assert.strictEqual(stockStatusTone['Out of Stock'], 'red')
})