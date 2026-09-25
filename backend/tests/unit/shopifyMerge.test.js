const test = require('node:test')
const assert = require('node:assert/strict')
const shopifyService = require('../../src/services/shopify.service')

test('shopifyImageUrls extracts non-empty image sources in order', () => {
  assert.deepEqual(
    shopifyService.shopifyImageUrls({ images: [{ src: 'https://a/1.jpg' }, { src: '' }, { src: 'https://a/2.jpg' }] }),
    ['https://a/1.jpg', 'https://a/2.jpg']
  )
  assert.deepEqual(shopifyService.shopifyImageUrls({ images: [] }), [])
  assert.deepEqual(shopifyService.shopifyImageUrls({}), [])
})

test('mergeImageUrls keeps store + ERP images, dedupes, preserves order', () => {
  const erp = ['https://cdn/erp-1.jpg', 'https://cdn/shared.jpg']
  const store = ['https://cdn/1.jpg', 'https://cdn/shared.jpg']
  assert.deepEqual(shopifyService.mergeImageUrls(store, erp), [
    'https://cdn/1.jpg',
    'https://cdn/shared.jpg',
    'https://cdn/erp-1.jpg',
  ])
})

test('mergeImageUrls without store images keeps ERP list intact (non-destructive)', () => {
  const erp = ['https://cdn/erp-1.jpg']
  assert.deepEqual(shopifyService.mergeImageUrls([], erp), ['https://cdn/erp-1.jpg'])
})