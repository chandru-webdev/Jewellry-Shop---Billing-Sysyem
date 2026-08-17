import apiClient from './client'

export const rolesApi = {
  list: () => apiClient.get('/roles'),
  create: (data) => apiClient.post('/roles', data),
  update: (id, data) => apiClient.put(`/roles/${id}`, data),
  remove: (id) => apiClient.delete(`/roles/${id}`),
}
