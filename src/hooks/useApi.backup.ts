import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ApiError {
  error: string
  status?: number
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  execute: (...args: any[]) => Promise<T | null>
  reset: () => void
}

export const useApi = <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const { logout } = useAuth()

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const [body, queryParams] = args
      let url = endpoint

      // Add query parameters for GET requests
      if (method === 'GET' && queryParams) {
        const params = new URLSearchParams(queryParams)
        url += `?${params.toString()}`
      }

      const config: RequestInit = {
        method,
        headers: getAuthHeaders(),
      }

      // Add body for non-GET requests
      if (method !== 'GET' && body) {
        config.body = JSON.stringify(body)
      }

      const response = await fetch(url, config)
      
      // Handle authentication errors
      if (response.status === 401) {
        logout()
        setError({ error: 'Session expired. Please log in again.', status: 401 })
        return null
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        setError({ error: errorData.error || 'Request failed', status: response.status })
        return null
      }

      const result = await response.json()
      setData(result)
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError({ error: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [endpoint, method, logout])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}

// Specialized hooks for common operations
export const useInventoryApi = () => {
  const getInventory = useApi('/api/inventory', 'GET')
  const getLowStock = useApi('/api/inventory/low-stock', 'GET')
  const updateStock = useApi('/api/inventory/:id/stock', 'PUT')
  const updateParLevel = useApi('/api/inventory/:id/par-level', 'PUT')
  const createItem = useApi('/api/inventory', 'POST')

  return {
    getInventory,
    getLowStock,
    updateStock,
    updateParLevel,
    createItem,
  }
}

export const useMenuApi = () => {
  const getMenu = useApi('/api/menu', 'GET')
  const get86List = useApi('/api/menu/86-list', 'GET')
  const add86Item = useApi('/api/menu/86/:id', 'POST')
  const remove86Item = useApi('/api/menu/86/:id', 'DELETE')

  return {
    getMenu,
    get86List,
    add86Item,
    remove86Item,
  }
}

export const useOrderApi = () => {
  const getOrders = useApi('/api/orders', 'GET')
  const getKitchenOrders = useApi('/api/orders/kitchen', 'GET')
  const createOrder = useApi('/api/orders', 'POST')
  const updateOrderStatus = useApi('/api/orders/:id/status', 'PUT')
  const getOrder = useApi('/api/orders/:id', 'GET')
  const cancelOrder = useApi('/api/orders/:id', 'DELETE')

  return {
    getOrders,
    getKitchenOrders,
    createOrder,
    updateOrderStatus,
    getOrder,
    cancelOrder,
  }
}

export const useAuthApi = () => {
  const getProfile = useApi('/api/auth/profile', 'GET')
  const updateProfile = useApi('/api/auth/profile', 'PUT')
  const changePassword = useApi('/api/auth/change-password', 'PUT')
  const logout = useApi('/api/auth/logout', 'POST')

  return {
    getProfile,
    updateProfile,
    changePassword,
    logout,
  }
}

// Helper hook for role-based conditional rendering
export const useRoleAccess = () => {
  const { 
    user,
    isOwner,
    isManager,
    isChef,
    isServer,
    isCustomer,
    isStaff,
    isManagement,
    isKitchenStaff,
    canManageUsers,
    canManageInventory,
    canManageMenu,
    canManageOrders,
    canViewReports,
    hasMinimumRole,
    hasAnyRole
  } = useAuth()

  // Helper function to conditionally render components based on roles
  const renderForRoles = (allowedRoles: Array<string>, component: React.ReactNode) => {
    if (!user || !hasAnyRole(allowedRoles as any)) return null
    return component
  }

  // Helper function to conditionally render components based on permissions
  const renderForPermission = (permission: keyof typeof useAuth, component: React.ReactNode) => {
    const auth = useAuth()
    if (!auth[permission] || !(auth[permission] as Function)()) return null
    return component
  }

  return {
    user,
    roles: {
      isOwner,
      isManager,
      isChef,
      isServer,
      isCustomer,
      isStaff,
      isManagement,
      isKitchenStaff,
    },
    permissions: {
      canManageUsers,
      canManageInventory,
      canManageMenu,
      canManageOrders,
      canViewReports,
    },
    utils: {
      hasMinimumRole,
      hasAnyRole,
      renderForRoles,
      renderForPermission,
    }
  }
}
