import apiClient from './client'

export const inventoryApi = {
  list: () => apiClient.get('/inventory'),
  transactions: (params) => apiClient.get('/inventory/transactions', { params }),
  stockIn: (data) => apiClient.post('/inventory/stock-in', data),
  stockOut: (data) => apiClient.post('/inventory/stock-out', data),
}
