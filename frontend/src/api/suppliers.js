import apiClient from './client'

export const suppliersApi = {
  list: (params) => apiClient.get('/suppliers', { params }),
  get: (id) => apiClient.get(`/suppliers/${id}`),
  create: (data) => apiClient.post('/suppliers', data),
  update: (id, data) => apiClient.put(`/suppliers/${id}`, data),
}
