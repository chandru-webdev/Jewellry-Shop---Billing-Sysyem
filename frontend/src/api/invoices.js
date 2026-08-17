import apiClient from './client'

export const invoicesApi = {
  list: (params) => apiClient.get('/invoices', { params }),
  get: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
}
