import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const checkSessionExpiry = useAuthStore(state => state.checkSessionExpiry)

  useEffect(() => {
    // Check session expiry on component mount and every minute
    checkSessionExpiry()

    const interval = setInterval(() => {
      checkSessionExpiry()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [checkSessionExpiry])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}