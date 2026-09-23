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
  retryFailedSyncs: () => apiClient.post('/shopify/sync-logs/retry-failed'),
  clearFailedLogs: () => apiClient.delete('/shopify/sync-logs'),

  // ERP vs Shopify comparisons
  getInventoryComparison: () => apiClient.get('/shopify/inventory-comparison'),
  getPriceComparison: () => apiClient.get('/shopify/price-comparison'),
}

// Data export
export const exportApi = {
  downloadCsv: (type) => apiClient.get(`/export/${type}`, { responseType: 'blob' }),
}

// Database backup / restore
export const backupApi = {
  list: () => apiClient.get('/backup'),
  create: () => apiClient.post('/backup'),
  get: (id) => apiClient.get(`/backup/${id}`),
  download: (id) => apiClient.get(`/backup/${id}`, { params: { download: 1 }, responseType: 'blob' }),
  restore: (id) => apiClient.post(`/backup/${id}/restore`),
}