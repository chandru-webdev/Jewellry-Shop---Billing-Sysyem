import apiClient from './client'

export const auditLogsApi = {
  list: (params) => apiClient.get('/audit-logs', { params }),
}
