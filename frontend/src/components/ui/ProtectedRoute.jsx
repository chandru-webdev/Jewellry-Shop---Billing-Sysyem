import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Wrap any page that requires login.
// If there's no logged-in user, send them to /login.
// If permission is specified, check that the user has it.
export default function ProtectedRoute({ children, permission }) {
  const { user, hasPermission } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />
  return children
}
