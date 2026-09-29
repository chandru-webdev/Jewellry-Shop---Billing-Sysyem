import apiClient from './client'
import { streamSse } from './sse'

export const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  remove: (id) => apiClient.delete(`/products/${id}`),
  duplicate: (id) => apiClient.post(`/products/${id}/duplicate`),
  approveImport: (id) => apiClient.post(`/products/${id}/approve-import`),
  discardImport: (id) => apiClient.post(`/products/${id}/discard-import`),
  syncProgress: (id) => apiClient.get(`/products/${id}/sync-progress`),

  // Stream a product update's step progress over SSE. Calls onEvent({status,
  // message, steps}) as events arrive and resolves when the sync finishes.
  // Uses fetch (not EventSource) so the JWT can be sent as a header.
  // Demo/offline mode has no backend stream — resolves immediately as idle.
  streamSyncProgress: async (id, { onEvent, signal } = {}) => {
    const demo = await streamSse(`/products/${id}/sync-progress/stream`, { onEvent, signal })
    if (demo) onEvent?.({ status: 'none', message: 'Demo mode — saved locally', steps: [] })
  },
}
