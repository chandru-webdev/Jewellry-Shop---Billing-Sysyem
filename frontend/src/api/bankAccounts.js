import apiClient from './client'

export const bankAccountsApi = {
  list: (params) => apiClient.get('/bank-accounts', { params }),
  summary: () => apiClient.get('/bank-accounts/summary'),
  get: (id) => apiClient.get(`/bank-accounts/${id}`),
  create: (data) => apiClient.post('/bank-accounts', data),
  update: (id, data) => apiClient.put(`/bank-accounts/${id}`, data),
  delete: (id) => apiClient.delete(`/bank-accounts/${id}`),
}