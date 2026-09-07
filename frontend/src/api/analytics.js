import apiClient from './client'

export const analyticsApi = {
  overview: (params = {}) => apiClient.get('/analytics/overview', { params }),
}