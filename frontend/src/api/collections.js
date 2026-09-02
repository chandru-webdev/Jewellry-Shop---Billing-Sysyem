import apiClient from './client'

export const collectionsApi = {
  list: (params) => apiClient.get('/collections', { params }),
  create: (data) => apiClient.post('/collections', data),
}