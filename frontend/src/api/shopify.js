import apiClient from './client'

export const shopifyApi = {
  // Latest sync status for each type (product / price / inventory / order)
  getSyncStatus: () => apiClient.get('/shopify/status'),

  // Manual sync jobs
  syncProduct: (id) => apiClient.post(`/shopify/sync/products/${id}`),
  syncAllProducts: () => apiClient.post('/shopify/sync/all-products'),
  syncAllPrices: () => apiClient.post('/shopify/sync/prices'),
  syncAllInventory: () => apiClient.post('/shopify/sync/inventory'),
  pullProducts: () => apiClient.post('/shopify/pull-products'),
  pullOrders: () => apiClient.post('/shopify/pull-orders'),
  pullCustomers: () => apiClient.post('/shopify/pull-customers'),

  // Fetch products from Shopify (preview/listing only, no import)
  fetchProducts: (params) => apiClient.get('/shopify/products', { params }),

  // Sync log entries
  getSyncLogs: (params) => apiClient.get('/shopify/sync-logs', { params }),

  // ERP vs Shopify comparisons
  getInventoryComparison: () => apiClient.get('/shopify/inventory-comparison'),
  getPriceComparison: () => apiClient.get('/shopify/price-comparison'),
}

// Data export
export const exportApi = {
  downloadCsv: (type) => apiClient.get(`/export/${type}`, { responseType: 'blob' }),
}