const test = require('node:test')
const assert = require('node:assert/strict')
const shopifyService = require('../../src/services/shopify.service')
const { ShopifyApiError } = require('../../src/integrations/shopify/client')

test('isStaleShopifyMappingError treats only a Shopify 404 as a dead mapping', () => {
  assert.equal(
    shopifyService.isStaleShopifyMappingError(new ShopifyApiError(404, 'Shopify API 404: {"errors":"Not Found"}')),
    true
  )
})

test('isStaleShopifyMappingError ignores every other Shopify status', () => {
  assert.equal(shopifyService.isStaleShopifyMappingError(new ShopifyApiError(422, 'bad metafield')), false)
  assert.equal(shopifyService.isStaleShopifyMappingError(new ShopifyApiError(429, 'throttled')), false)
  assert.equal(shopifyService.isStaleShopifyMappingError(new ShopifyApiError(503, 'not configured')), false)
})

test('isStaleShopifyMappingError ignores non-Shopify errors and empty values', () => {
  assert.equal(shopifyService.isStaleShopifyMappingError(new Error('fetch failed')), false)
  assert.equal(shopifyService.isStaleShopifyMappingError({ status: 404 }), false)
  assert.equal(shopifyService.isStaleShopifyMappingError(null), false)
  assert.equal(shopifyService.isStaleShopifyMappingError(undefined), false)
})
