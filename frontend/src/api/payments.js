import apiClient from './client'

export const paymentsApi = {
  list: (params) => apiClient.get('/payments', { params }),
  dues: () => apiClient.get('/payments/dues'),
  summary: () => apiClient.get('/payments/summary'),
  get: (id) => apiClient.get(`/payments/${id}`),
  create: (data) => apiClient.post('/payments', data),
}
