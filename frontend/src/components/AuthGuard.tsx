import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '../contexts/RoleContext'

export default function AuthGuard() {
  const { isAuthenticated } = useRole()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
