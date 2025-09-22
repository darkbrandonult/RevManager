import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'

interface Order {
  id: number
  table_number: number
  customer_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  items: OrderItem[]
}

interface OrderItem {
  id: number
  menu_item_name: string
  quantity: number
  price: number
  special_instructions: string
}

interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  is_available: boolean
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  
  const { user } = useAuth()
  const socket = useSocket()

  // Mock token and permissions for now
  const token = 'mock-token'
  const hasRole = (role: string) => user?.role === role || role === 'server'
  const hasPermission = (permission: string) => permission !== 'orders:delete' || user?.role === 'manager' || user?.role === 'owner'

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      
      const data = await response.json()
      setOrders(data.orders)
      setError(null)
    } catch (err) {
      setError('Error loading orders')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch menu items (currently unused)
  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu items')
      }
      
      // const data = await response.json()
      // Menu items would be used for order creation
    } catch (err) {
      console.error('Error fetching menu items:', err)
    }
  }

  // Update order status
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order status')
      }
      
      // Refresh orders
      await fetchOrders()
    } catch (err) {
      setError('Error updating order status')
      console.error('Error updating order status:', err)
    }
  }

  // Create new order (currently unused)
  // const createOrder = async (orderData: any) => {
  //   try {
  //     const response = await fetch('/api/orders', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify(orderData)
  //     })
      
  //     if (!response.ok) {
  //       const errorData = await response.json()
  //       throw new Error(errorData.error || 'Failed to create order')
  //     }
      
  //     await fetchOrders()
  //   } catch (err) {
  //     setError('Error creating order')
  //     console.error('Error creating order:', err)
  //   }
  // }

  // Delete order
  const deleteOrder = async (orderId: number) => {
    if (!hasPermission('orders:delete')) {
      setError('Access denied')
      return
    }
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete order')
      }
      
      await fetchOrders()
    } catch (err) {
      setError('Error deleting order')
      console.error('Error deleting order:', err)
    }
  }

  // Filter orders
  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  useEffect(() => {
    fetchOrders()
    fetchMenuItems()
  }, [statusFilter])

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('new_order', (newOrder: Order) => {
        setOrders(prev => [newOrder, ...prev])
      })
      
      socket.on('order_status_updated', (updatedOrder: Order) => {
        setOrders(prev => 
          prev.map(order => 
            order.id === updatedOrder.id ? updatedOrder : order
          )
        )
      })
      
      return () => {
        socket.off('new_order')
        socket.off('order_status_updated')
      }
    }
  }, [socket])

  if (loading) {
    return <div className="p-6">Loading orders...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <button
          onClick={() => console.log('Create new order')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create New Order
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
          <button 
            onClick={fetchOrders}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No orders found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{order.customer_name}</h3>
                  <p className="text-sm text-gray-600">Table {order.table_number}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View Details
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Mark Completed
                    </button>
                  )}
                  {hasPermission('orders:delete') && (hasRole('manager') || hasRole('owner')) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this order?')) {
                          deleteOrder(order.id)
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete Order
                    </button>
                  )}
                </div>
              </div>
              
              {expandedOrder === order.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Order Items:</h4>
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between py-2">
                      <div>
                        <span className="font-medium">{item.menu_item_name}</span>
                        <span className="ml-2 text-gray-600">Quantity: {item.quantity}</span>
                        {item.special_instructions && (
                          <p className="text-sm text-gray-500">{item.special_instructions}</p>
                        )}
                      </div>
                      <span>${item.price}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-medium">
                    Total: ${order.total_amount}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Additional features for managers */}
      {(hasRole('manager') || hasRole('owner')) && (
        <div className="mt-8 flex gap-4">
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            Order Analytics
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderManagement
