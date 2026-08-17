import apiClient from './client'

export const searchApi = {
  search: (query, signal) =>
    apiClient.get('/search', { params: { q: query }, signal }),
}
