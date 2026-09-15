import apiClient from './client'

export const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  remove: (id) => apiClient.delete(`/products/${id}`),
  duplicate: (id) => apiClient.post(`/products/${id}/duplicate`),
  approveImport: (id) => apiClient.post(`/products/${id}/approve-import`),
  discardImport: (id) => apiClient.post(`/products/${id}/discard-import`),
}
