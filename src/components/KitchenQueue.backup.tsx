import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

interface OrderItem {
  id: number
  menu_item_id: number
  menu_item_name: string
  quantity: number
  price: number
  notes?: string
}

interface Order {
  id: number
  customer_name: string
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  updated_at: string
  created_by: number
  created_by_name?: string
  items: OrderItem[]
  estimated_completion?: string
  priority?: 'normal' | 'high' | 'urgent'
}

interface OrderStatusUpdate {
  orderId: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  updatedBy: number
  updatedByName: string
  timestamp: string
  estimatedCompletion?: string
}

const KitchenQueue = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrders, setUpdatingOrders] = useState<Set<number>>(new Set())

  // Check if user has kitchen access
  const hasKitchenAccess = user?.role && ['chef', 'cook', 'manager', 'owner'].includes(user.role)

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/orders/kitchen', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`)
      }

      const ordersData = await response.json()
      setOrders(ordersData)
    } catch (err) {
      console.error('Error fetching kitchen orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: number, newStatus: Order['status'], estimatedMinutes?: number) => {
    if (!user) return

    try {
      setUpdatingOrders(prev => new Set(prev).add(orderId))
      
      const requestBody: any = {
        status: newStatus,
        updated_by: user.id
      }

      // Add estimated completion time for preparing status
      if (newStatus === 'preparing' && estimatedMinutes) {
        const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60000).toISOString()
        requestBody.estimated_completion = estimatedCompletion
      }

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.statusText}`)
      }

      const updatedOrder = await response.json()
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, ...updatedOrder } : order
      ))

      console.log(`✅ Order ${orderId} status updated to ${newStatus}`)
    } catch (err) {
      console.error('Error updating order status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update order')
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }, [user])

  // Socket.io event handlers
  useEffect(() => {
    if (!socket) return

    const handleNewOrder = (orderData: Order) => {
      console.log('🍳 NEW ORDER RECEIVED:', orderData)
      setOrders(prev => [orderData, ...prev])
      
      // Show notification for new orders
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order!', {
          body: `Order #${orderData.id} for ${orderData.customer_name}`,
          icon: '/favicon.ico'
        })
      }
    }

    const handleOrderStatusUpdate = (updateData: OrderStatusUpdate) => {
      console.log('📱 ORDER STATUS UPDATE:', updateData)
      setOrders(prev => prev.map(order => {
        if (order.id === updateData.orderId) {
          return {
            ...order,
            status: updateData.status,
            updated_at: updateData.timestamp,
            estimated_completion: updateData.estimatedCompletion || order.estimated_completion
          }
        }
        return order
      }))
    }

    const handleOrderCancelled = (orderData: { orderId: number, reason?: string }) => {
      console.log('❌ ORDER CANCELLED:', orderData)
      setOrders(prev => prev.map(order => 
        order.id === orderData.orderId 
          ? { ...order, status: 'cancelled' as const }
          : order
      ))
    }

    // Listen for real-time events
    socket.on('new-order', handleNewOrder)
    socket.on('order-status-update', handleOrderStatusUpdate)
    socket.on('order-cancelled', handleOrderCancelled)

    return () => {
      socket.off('new-order', handleNewOrder)
      socket.off('order-status-update', handleOrderStatusUpdate)
      socket.off('order-cancelled', handleOrderCancelled)
    }
  }, [socket])

  // Initial data fetch
  useEffect(() => {
    if (hasKitchenAccess) {
      fetchOrders()
    }
  }, [fetchOrders, hasKitchenAccess])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Helper functions
  const getOrdersByStatus = useCallback((status: Order['status']) => {
    return orders.filter(order => order.status === status)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [orders])

  const getOrderPriority = (order: Order): 'normal' | 'high' | 'urgent' => {
    const orderTime = new Date(order.created_at).getTime()
    const now = Date.now()
    const minutesOld = (now - orderTime) / (1000 * 60)

    if (minutesOld > 30) return 'urgent'
    if (minutesOld > 15) return 'high'
    return 'normal'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getTimeElapsed = (dateString: string) => {
    const orderTime = new Date(dateString).getTime()
    const now = Date.now()
    const minutesElapsed = Math.floor((now - orderTime) / (1000 * 60))
    
    if (minutesElapsed < 1) return 'Just now'
    if (minutesElapsed < 60) return `${minutesElapsed}m ago`
    
    const hoursElapsed = Math.floor(minutesElapsed / 60)
    const remainingMinutes = minutesElapsed % 60
    return `${hoursElapsed}h ${remainingMinutes}m ago`
  }

  if (!hasKitchenAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You need kitchen access (chef, cook, manager, or owner role) to view the order queue.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading kitchen queue...</p>
          </div>
        </div>
      </div>
    )
  }

  const pendingOrders = getOrdersByStatus('pending')
  const preparingOrders = getOrdersByStatus('preparing')
  const readyOrders = getOrdersByStatus('ready')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kitchen Queue</h1>
            <p className="text-gray-600">Real-time order management for kitchen staff</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live Updates</span>
            </div>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{pendingOrders.length}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800">Preparing</p>
            <p className="text-2xl font-bold text-blue-900">{preparingOrders.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">Ready</p>
            <p className="text-2xl font-bold text-green-900">{readyOrders.length}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-800">Total Active</p>
            <p className="text-2xl font-bold text-gray-900">
              {pendingOrders.length + preparingOrders.length + readyOrders.length}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Order Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b border-gray-200 bg-yellow-50">
            <h2 className="text-lg font-semibold text-yellow-800 flex items-center gap-2">
              ⏳ Pending Orders ({pendingOrders.length})
            </h2>
            <p className="text-sm text-yellow-600 mt-1">New orders waiting to be started</p>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending orders</p>
            ) : (
              pendingOrders.map((order) => {
                const priority = getOrderPriority(order)
                const isUpdating = updatingOrders.has(order.id)
                
                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-4 ${
                      priority === 'urgent' 
                        ? 'border-red-300 bg-red-50'
                        : priority === 'high'
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatTime(order.created_at)} • {getTimeElapsed(order.created_at)}
                        </p>
                      </div>
                      {priority !== 'normal' && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          priority === 'urgent' 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && (
                            <span className="text-gray-500 italic">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing', 20)}
                      disabled={isUpdating}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? 'Starting...' : '🍳 Start Preparing'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Preparing Orders */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              🍳 Preparing ({preparingOrders.length})
            </h2>
            <p className="text-sm text-blue-600 mt-1">Orders currently being prepared</p>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {preparingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders being prepared</p>
            ) : (
              preparingOrders.map((order) => {
                const isUpdating = updatingOrders.has(order.id)
                
                return (
                  <div
                    key={order.id}
                    className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          Started: {formatTime(order.updated_at)}
                        </p>
                        {order.estimated_completion && (
                          <p className="text-xs text-blue-600 font-medium">
                            ETA: {formatTime(order.estimated_completion)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-600">In Progress</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && (
                            <span className="text-gray-500 italic">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      disabled={isUpdating}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? 'Marking Ready...' : '✅ Mark Ready'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Ready Orders */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              ✅ Ready for Pickup ({readyOrders.length})
            </h2>
            <p className="text-sm text-green-600 mt-1">Orders ready for servers to deliver</p>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders ready</p>
            ) : (
              readyOrders.map((order) => {
                const isUpdating = updatingOrders.has(order.id)
                
                return (
                  <div
                    key={order.id}
                    className="border border-green-200 bg-green-50 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          Ready: {formatTime(order.updated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600">Ready</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && (
                            <span className="text-gray-500 italic">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        disabled={isUpdating}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {isUpdating ? 'Completing...' : '📦 Complete'}
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        disabled={isUpdating}
                        className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenQueue
