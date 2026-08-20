import apiClient from './client'

export const metalRatesApi = {
  getCurrent: () => apiClient.get('/metal-rates'),
  getHistory: (params) => apiClient.get('/metal-rates/history', { params }),
  preview: (rate) => apiClient.post('/metal-rates/preview', { rate }),
  updateSilver: (rate) => apiClient.put('/metal-rates/silver', { rate }),
  // Rate approval workflow
  createRequest: (rate) => apiClient.post('/rate-requests', { rate }),
  listRequests: (status) => apiClient.get('/rate-requests', { params: { status } }),
  reviewRequest: (id, status) => apiClient.patch(`/rate-requests/${id}/review`, { status }),
}
