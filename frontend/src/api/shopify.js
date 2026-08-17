import apiClient from './client'

export const shopifyApi = {
  // Latest sync status for each type (product / price / inventory / order)
  getStatus: () => apiClient.get('/shopify/status'),

  // Manual sync jobs
  syncProduct: (id) => apiClient.post(`/shopify/sync/products/${id}`),
  syncAllProducts: () => apiClient.post('/shopify/sync/all-products'),
  syncAllPrices: () => apiClient.post('/shopify/sync/prices'),
  syncAllInventory: () => apiClient.post('/shopify/sync/inventory'),
}
