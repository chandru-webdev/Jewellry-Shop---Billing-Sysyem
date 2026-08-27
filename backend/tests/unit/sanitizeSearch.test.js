const { test } = require('node:test')
const assert = require('node:assert')
const { escapeLike } = require('../../src/utils/sanitizeSearch')

test('returns empty string for null/undefined input', () => {
  assert.strictEqual(escapeLike(null), '')
  assert.strictEqual(escapeLike(undefined), '')
  assert.strictEqual(escapeLike(''), '')
})

test('trims whitespace', () => {
  assert.strictEqual(escapeLike('  hello  '), 'hello')
})

test('escapes % wildcard', () => {
  assert.strictEqual(escapeLike('100%'), '100\\%')
  assert.strictEqual(escapeLike('%test%'), '\\%test\\%')
})

test('escapes _ wildcard', () => {
  assert.strictEqual(escapeLike('test_value'), 'test\\_value')
  assert.strictEqual(escapeLike('_a_b_'), '\\_a\\_b\\_')
})

test('escapes both % and _ together', () => {
  assert.strictEqual(escapeLike('100%_done'), '100\\%\\_done')
})

test('truncates to 100 characters', () => {
  const long = 'a'.repeat(150)
  assert.strictEqual(escapeLike(long).length, 100)
})

test('passes through normal text unchanged', () => {
  assert.strictEqual(escapeLike('Silver Chain 925'), 'Silver Chain 925')
  assert.strictEqual(escapeLike('INV-2026-001'), 'INV-2026-001')
})

test('handles numeric input by converting to string', () => {
  assert.strictEqual(escapeLike(123), '123')
  assert.strictEqual(escapeLike(42), '42')
})
