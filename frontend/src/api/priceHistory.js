import apiClient from './client'

export const priceHistoryApi = {
  list: (params) => apiClient.get('/price-history', { params }),
  getStats: (params) => apiClient.get('/price-history/stats', { params }),
  getByProduct: (productId, params) => apiClient.get(`/price-history/product/${productId}`, { params }),
  getById: (id) => apiClient.get(`/price-history/${id}`),
  create: (data) => apiClient.post('/price-history', data),
}
