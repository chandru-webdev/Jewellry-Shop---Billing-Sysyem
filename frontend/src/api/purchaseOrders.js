import apiClient from './client'

export const purchaseOrdersApi = {
  list: (params) => apiClient.get('/purchase-orders', { params }),
  get: (id) => apiClient.get(`/purchase-orders/${id}`),
  create: (data) => apiClient.post('/purchase-orders', data),
  updateStatus: (id, status) => apiClient.patch(`/purchase-orders/${id}/status`, { status }),
  remove: (id) => apiClient.delete(`/purchase-orders/${id}`),
}
