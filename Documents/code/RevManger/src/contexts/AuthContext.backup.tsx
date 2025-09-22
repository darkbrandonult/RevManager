import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'manager' | 'chef' | 'server' | 'customer'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  // Role checking methods
  isOwner: () => boolean
  isManager: () => boolean
  isChef: () => boolean
  isServer: () => boolean
  isCustomer: () => boolean
  // Composite role checks
  isStaff: () => boolean
  isManagement: () => boolean
  isKitchenStaff: () => boolean
  // Permission checks
  canManageUsers: () => boolean
  canManageInventory: () => boolean
  canManageMenu: () => boolean
  canManageOrders: () => boolean
  canViewReports: () => boolean
  hasMinimumRole: (requiredRole: User['role']) => boolean
  hasAnyRole: (allowedRoles: User['role'][]) => boolean
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  customer: 0,
  server: 1,
  chef: 2,
  manager: 3,
  owner: 4
} as const

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Validate token and get user data
      validateToken(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.warn('Token validation failed, continuing without auth:', error)
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
        localStorage.setItem('token', userData.token)
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // Notify server of logout
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('token')
    }
  }

  // Role checking methods
  const isOwner = () => user?.role === 'owner'
  const isManager = () => user?.role === 'manager'
  const isChef = () => user?.role === 'chef'
  const isServer = () => user?.role === 'server'
  const isCustomer = () => user?.role === 'customer'

  // Composite role checks
  const isStaff = () => user && ['server', 'chef', 'manager', 'owner'].includes(user.role)
  const isManagement = () => user && ['manager', 'owner'].includes(user.role)
  const isKitchenStaff = () => user && ['chef', 'manager', 'owner'].includes(user.role)

  // Permission-based checks
  const canManageUsers = () => user && ['manager', 'owner'].includes(user.role)
  const canManageInventory = () => user && ['chef', 'manager', 'owner'].includes(user.role)
  const canManageMenu = () => user && ['chef', 'manager', 'owner'].includes(user.role)
  const canManageOrders = () => user && ['server', 'chef', 'manager', 'owner'].includes(user.role)
  const canViewReports = () => user && ['manager', 'owner'].includes(user.role)

  // Generic role hierarchy check
  const hasMinimumRole = (requiredRole: User['role']) => {
    if (!user) return false
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]
  }

  // Check if user has any of the allowed roles
  const hasAnyRole = (allowedRoles: User['role'][]) => {
    if (!user) return false
    return allowedRoles.includes(user.role)
  }

  const isAuthenticated = user !== null

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    // Role checks
    isOwner,
    isManager,
    isChef,
    isServer,
    isCustomer,
    // Composite checks
    isStaff,
    isManagement,
    isKitchenStaff,
    // Permission checks
    canManageUsers,
    canManageInventory,
    canManageMenu,
    canManageOrders,
    canViewReports,
    hasMinimumRole,
    hasAnyRole,
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
