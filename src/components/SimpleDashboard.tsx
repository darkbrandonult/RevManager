import { useState, useEffect } from 'react'

interface OrderStats {
  totalOrders: number
  pending: number
  inProgress: number
  completed: number
  revenue: number
}

interface MenuItemStatus {
  id: number
  name: string
  available: boolean
  quantity?: number
}

interface SimpleDashboardProps {
  onNavigateToTab?: (tabId: string) => void;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ onNavigateToTab }) => {
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    revenue: 0
  })
  const [menuItems, setMenuItems] = useState<MenuItemStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Simulate API calls with timeout
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )

        // Try to fetch real data first
        try {
          const [ordersResponse, menuResponse] = await Promise.race([
            Promise.all([
              fetch('/api/orders/stats'),
              fetch('/api/menu/items')
            ]),
            timeout
          ]) as Response[]

          if (ordersResponse.ok && menuResponse.ok) {
            const ordersData = await ordersResponse.json()
            const menuData = await menuResponse.json()
            
            setOrderStats(ordersData)
            setMenuItems(menuData.slice(0, 10)) // Show first 10 items
          } else {
            throw new Error('API request failed')
          }
        } catch (apiError) {
          console.warn('API unavailable, using demo data:', apiError)
          
          // Use static demo data
          setOrderStats({
            totalOrders: 23,
            pending: 5,
            inProgress: 8,
            completed: 10,
            revenue: 1250.50
          })

          setMenuItems([
            { id: 1, name: 'Margherita Pizza', available: true, quantity: 15 },
            { id: 2, name: 'Caesar Salad', available: true, quantity: 8 },
            { id: 3, name: 'Grilled Salmon', available: false, quantity: 0 },
            { id: 4, name: 'Garlic Bread', available: true, quantity: 12 },
            { id: 5, name: 'Chicken Alfredo', available: true, quantity: 6 }
          ])
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">📋</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">⏳</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{orderStats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">🔥</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{orderStats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">✅</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{orderStats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">💰</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${orderStats.revenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🍳 Kitchen Management</h3>
            <p className="text-gray-600 mb-4">View and manage active orders in the kitchen queue.</p>
            <button 
              onClick={() => onNavigateToTab?.('kitchen')}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
            >
              Open Kitchen View
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Menu Management</h3>
            <p className="text-gray-600 mb-4">Update menu items, prices, and availability.</p>
            <button 
              onClick={() => onNavigateToTab?.('menu-management')}
              className="block w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
            >
              Manage Menu
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Staff & Payroll</h3>
            <p className="text-gray-600 mb-4">Manage staff roles, time tracking, and payroll.</p>
            <button 
              onClick={() => onNavigateToTab?.('staff')}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
            >
              Manage Staff
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Reports</h3>
            <p className="text-gray-600 mb-4">View sales reports and analytics.</p>
            <button 
              onClick={() => onNavigateToTab?.('reports')}
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Menu Status */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🍽️ Menu Item Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-lg border-2 ${
                    item.available 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.available ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                  {item.quantity !== undefined && (
                    <p className="text-sm text-gray-600 mt-2">
                      Quantity: {item.quantity}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleDashboard
