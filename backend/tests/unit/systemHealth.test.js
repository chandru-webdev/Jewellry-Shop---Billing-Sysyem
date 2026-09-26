const { test } = require('node:test')
const assert = require('node:assert')
const { sanitizeError } = require('../../src/services/systemHealth.service')

test('masks user:pass credentials inside URLs', () => {
  assert.strictEqual(sanitizeError('failed at https://admin:supersecret@db.example.com:5432/x'), 'failed at https://***@db.example.com:5432/x')
})

test('masks query-string token parameters', () => {
  assert.strictEqual(
    sanitizeError('got 401? access_token=abc123&scope=s'),
    'got 401? access_token=***&scope=s'
  )
  assert.strictEqual(sanitizeError('?password=hunter2'), '?password=***')
})

test('masks Bearer tokens', () => {
  assert.strictEqual(sanitizeError('Unauthorized — Bearer eyJhbGciOiJIUzI1NiJ9.abc.def'), 'Unauthorized — Bearer ***')
})

test('masks Authorization and token headers fully', () => {
  assert.strictEqual(sanitizeError('Authorization: Basic dXNlcjpwYXNz'), 'Authorization: ***')
  assert.strictEqual(sanitizeError('x-shopify-access-token: shpat_1234567890'), 'x-shopify-access-token: ***')
})

test('leaves ordinary messages untouched', () => {
  assert.strictEqual(sanitizeError('Connection refused (ETIMEDOUT)'), 'Connection refused (ETIMEDOUT)')
  assert.strictEqual(sanitizeError(null), null)
  assert.strictEqual(sanitizeError(undefined), undefined)
})

test('truncates to max length', () => {
  const long = 'x'.repeat(700)
  assert.strictEqual(sanitizeError(long, 100).length, 100)
})