import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth"

export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg">
        <span className="material-symbols-outlined text-gray-400 animate-spin text-3xl">progress_activity</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
