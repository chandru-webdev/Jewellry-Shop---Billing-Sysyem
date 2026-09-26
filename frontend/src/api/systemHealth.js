import apiClient from './client'

export const systemHealthApi = {
  // Run all seven checks
  getAll: () => apiClient.get('/system-health'),
  // Re-run one check (per-tile Recheck button)
  getOne: (key) => apiClient.get(`/system-health/${key}`),
}