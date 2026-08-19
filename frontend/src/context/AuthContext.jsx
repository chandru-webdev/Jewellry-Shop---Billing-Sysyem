import { createContext, useContext, useState, useCallback } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

function getStoredUser() {
  try {
    const stored = localStorage.getItem('opal_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// Check if user has a specific permission
function hasPermission(user, permission) {
  if (!user?.role) return false
  const perms = user.role.permissions
  if (!Array.isArray(perms)) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

// Check if user has ANY of the listed permissions
function hasAnyPermission(user, permissions) {
  return permissions.some((p) => hasPermission(user, p))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password })
    const { token, user: userData } = res.data.data
    localStorage.setItem('opal_token', token)
    localStorage.setItem('opal_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('opal_token')
    localStorage.removeItem('opal_user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me')
      const userData = res.data.data
      localStorage.setItem('opal_user', JSON.stringify(userData))
      setUser(userData)
    } catch {
      // Ignore errors
    }
  }, [])

  const value = {
    user,
    login,
    logout,
    refreshUser,
    hasPermission: (perm) => hasPermission(user, perm),
    hasAnyPermission: (perms) => hasAnyPermission(user, perms),
    isSuperAdmin: user?.role?.name === 'SUPER_ADMIN',
    isManager: user?.role?.name === 'MANAGER',
    isEmployee: user?.role?.name === 'EMPLOYEE',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
