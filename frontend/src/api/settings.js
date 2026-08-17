import apiClient from './client'

export const settingsApi = {
  getAll: () => apiClient.get('/settings'),
  update: (data) => apiClient.put('/settings', data),
}
