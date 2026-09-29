import apiClient from './client'
import { streamSse } from './sse'

export const shopifyApi = {
  // Latest sync status for each type (product / price / inventory / order)
  getSyncStatus: () => apiClient.get('/shopify/status'),

  // Integration config (store connection) — SUPER_ADMIN only
  getConfig: () => apiClient.get('/shopify/config'),
  saveConfig: (data) => apiClient.put('/shopify/config', data),
  clearConfig: () => apiClient.delete('/shopify/config'),
  testConnection: () => apiClient.post('/shopify/test-connection'),
  registerWebhooks: () => apiClient.post('/shopify/webhooks/register'),

  // Manual bulk sync jobs — return immediately with { jobId }; stream that
  // jobId via syncProgress()/streamSyncProgress() for live progress.
  syncProduct: (id) => apiClient.post(`/shopify/sync/products/${id}`),
  syncAllProducts: () => apiClient.post('/shopify/sync/all-products'),
  syncAllPrices: () => apiClient.post('/shopify/sync/prices'),
  syncAllInventory: () => apiClient.post('/shopify/sync/inventory'),
  pullProducts: () => apiClient.post('/shopify/pull-products'),
  pullOrders: () => apiClient.post('/shopify/pull-orders'),
  pullCustomers: () => apiClient.post('/shopify/pull-customers'),

  // Bulk sync progress: snapshot + live SSE stream for a jobId.
  syncProgress: (jobId) => apiClient.get(`/shopify/sync-progress/${jobId}`),
  streamSyncProgress: async (jobId, { onEvent, signal } = {}) => {
    const demo = await streamSse(`/shopify/sync-progress/${jobId}/stream`, { onEvent, signal })
    if (demo) onEvent?.({ status: 'none', message: 'Demo mode — sync skipped', steps: [], total: 0, done: 0 })
  },

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