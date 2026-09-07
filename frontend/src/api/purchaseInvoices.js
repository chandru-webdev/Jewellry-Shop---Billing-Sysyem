import apiClient from './client'

export const purchaseInvoicesApi = {
  list: (params) => apiClient.get('/purchase-invoices', { params }),
  get: (id) => apiClient.get(`/purchase-invoices/${id}`),
  create: (data) => apiClient.post('/purchase-invoices', data),
  update: (id, data) => apiClient.put(`/purchase-invoices/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/purchase-invoices/${id}/status`, { status }),
  remove: (id) => apiClient.delete(`/purchase-invoices/${id}`),
  recordPayment: (id, data) => apiClient.post(`/purchase-invoices/${id}/payment`, data),
  refreshPaymentState: (id) => apiClient.post(`/purchase-invoices/${id}/refresh-payment`),
}