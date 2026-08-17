import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Wrap any page that requires login.
// If there's no logged-in user, send them to /login.
export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}
