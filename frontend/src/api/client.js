import axios from 'axios'

const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('opal_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if we're not already on the login page
    // and the error is a real 401 (not a network error from demo/offline mode)
    if (error.response?.status === 401) {
      const token = localStorage.getItem('opal_token')
      // If we have a demo token, don't redirect — just let the component handle the error
      if (token === 'demo-token-opal-line') {
        return Promise.reject(error)
      }
      // Real backend 401: clear token and redirect
      localStorage.removeItem('opal_token')
      localStorage.removeItem('opal_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
