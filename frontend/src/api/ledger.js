import apiClient from './client'

export const ledgerApi = {
  list: (params) => apiClient.get('/ledger', { params }),
  accounts: () => apiClient.get('/ledger/accounts'),
  trialBalance: () => apiClient.get('/ledger/trial-balance'),
  get: (id) => apiClient.get(`/ledger/${id}`),
  create: (data) => apiClient.post('/ledger', data),
}