import apiClient from './client'

export const notificationsApi = {
  list: (params = {}) => apiClient.get('/notifications', { params }),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
}
