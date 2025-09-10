import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: Array<'owner' | 'manager' | 'chef' | 'server' | 'customer'>
  requiredPermission?: 'canManageUsers' | 'canManageInventory' | 'canManageMenu' | 'canManageOrders' | 'canViewReports'
  requireAuth?: boolean
  fallbackPath?: string
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles, 
  requiredPermission, 
  requireAuth = true,
  fallbackPath = '/login' 
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, hasAnyRole } = useAuth()
  const location = useLocation()

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRoles && user && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required roles: {requiredRoles.join(', ')}
            <br />
            Your role: {user.role}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Check permission requirements
  if (requiredPermission && user) {
    const auth = useAuth()
    const hasPermission = auth[requiredPermission]()
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="text-red-600 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to perform this action.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Required permission: {requiredPermission}
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

// Convenience components for common role combinations
export const StaffRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['server', 'chef', 'manager', 'owner']}>
    {children}
  </ProtectedRoute>
)

export const ManagementRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['manager', 'owner']}>
    {children}
  </ProtectedRoute>
)

export const KitchenRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['chef', 'manager', 'owner']}>
    {children}
  </ProtectedRoute>
)

export const OwnerRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRoles={['owner']}>
    {children}
  </ProtectedRoute>
)
