import apiClient from './client'

export const reportsApi = {
  sales: (params) => apiClient.get('/reports/sales', { params }),
  business: (params) => apiClient.get('/reports/business', { params }),
  inventory: () => apiClient.get('/reports/inventory'),
  products: (params) => apiClient.get('/reports/products', { params }),
}
