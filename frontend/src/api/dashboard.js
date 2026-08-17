import apiClient from './client'

export const dashboardApi = {
  getStats: (params = {}) => apiClient.get('/dashboard', { params }),
}
