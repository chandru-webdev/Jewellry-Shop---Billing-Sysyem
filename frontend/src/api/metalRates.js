import apiClient from './client'

export const metalRatesApi = {
  getCurrent: () => apiClient.get('/metal-rates'),
  getHistory: (params) => apiClient.get('/metal-rates/history', { params }),
  preview: (rate) => apiClient.post('/metal-rates/preview', { rate }),
  updateSilver: (rate) => apiClient.put('/metal-rates/silver', { rate }),
}
