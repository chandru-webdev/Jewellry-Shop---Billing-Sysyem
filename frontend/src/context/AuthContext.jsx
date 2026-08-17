import { createContext, useContext, useState, useCallback } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

const DEMO_USER = {
  id: 1,
  name: 'Rajesh Gupta',
  email: 'admin@opalline.in',
  role: { id: 1, name: 'ADMIN' },
}
const DEMO_TOKEN = 'demo-token-opal-line'

function getStoredUser() {
  try {
    const stored = localStorage.getItem('opal_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)

  const login = useCallback(async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password })
      const { token, user: userData } = res.data.data
      localStorage.setItem('opal_token', token)
      localStorage.setItem('opal_user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch {
      if (email === 'admin@opalline.in' && password === 'admin123') {
        localStorage.setItem('opal_token', DEMO_TOKEN)
        localStorage.setItem('opal_user', JSON.stringify(DEMO_USER))
        setUser(DEMO_USER)
        return DEMO_USER
      }
      throw new Error('Invalid email or password')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('opal_token')
    localStorage.removeItem('opal_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
