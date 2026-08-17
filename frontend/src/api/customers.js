import apiClient from './client'

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }),
  get: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data),
}
