import apiClient from './client'

export const purchaseReturnsApi = {
  list: (params) => apiClient.get('/purchase-returns', { params }),
  get: (id) => apiClient.get(`/purchase-returns/${id}`),
  create: (data) => apiClient.post('/purchase-returns', data),
  update: (id, data) => apiClient.put(`/purchase-returns/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/purchase-returns/${id}/status`, { status }),
  remove: (id) => apiClient.delete(`/purchase-returns/${id}`),
}
