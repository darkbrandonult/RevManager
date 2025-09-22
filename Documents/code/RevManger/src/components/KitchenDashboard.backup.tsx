import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

interface OrderSummary {
  pending: number
  preparing: number
  ready: number
  completed_today: number
  total_revenue_today: number
}

interface RecentActivity {
  id: string
  type: 'new-order' | 'status-change' | 'order-cancelled'
  orderId: number
  customerName?: string
  status?: string
  timestamp: string
  message: string
}

const KitchenDashboard = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [summary, setSummary] = useState<OrderSummary>({
    pending: 0,
    preparing: 0,
    ready: 0,
    completed_today: 0,
    total_revenue_today: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Check if user has kitchen access
  const hasKitchenAccess = user?.role && ['chef', 'cook', 'manager', 'owner'].includes(user.role)

  // Fetch kitchen summary data
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/orders/kitchen/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error fetching kitchen summary:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/orders/kitchen/activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecentActivity(data)
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  useEffect(() => {
    if (hasKitchenAccess) {
      fetchSummary()
      fetchRecentActivity()
    }
  }, [hasKitchenAccess])

  useEffect(() => {
    if (socket && hasKitchenAccess) {
      // Listen for real-time kitchen updates
      socket.on('kitchen-summary-update', (data: OrderSummary) => {
        setSummary(data)
      })

      socket.on('kitchen-activity-update', (activity: RecentActivity) => {
        setRecentActivity(prev => [activity, ...prev.slice(0, 9)])
      })

      return () => {
        socket.off('kitchen-summary-update')
        socket.off('kitchen-activity-update')
      }
    }
  }, [socket, hasKitchenAccess])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!hasKitchenAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            You don't have permission to access the kitchen dashboard. This area is restricted to kitchen staff and managers.
          </p>
          <a 
            href="/dashboard" 
            className="btn-primary inline-flex items-center space-x-2"
          >
            <span>← Back to Dashboard</span>
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-slate-600 mt-4 text-center">Loading kitchen data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-soft border-b border-slate-200">
        <div className="container mx-auto py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Kitchen Dashboard
              </h1>
              <p className="text-slate-600 mt-1">
                Real-time kitchen operations overview
              </p>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center px-3 py-1.5 bg-success-100 text-success-800 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
                Live Updates
              </div>
              <a
                href="/kitchen/queue"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                🍳 Kitchen Queue
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{summary.pending}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Preparing</p>
                <p className="text-2xl font-bold text-blue-900">{summary.preparing}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">🍳</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Ready</p>
                <p className="text-2xl font-bold text-green-900">{summary.ready}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{summary.completed_today}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Revenue Today</p>
                <p className="text-xl font-bold text-purple-900">${summary.total_revenue_today.toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'new-order' ? 'bg-blue-500' :
                      activity.type === 'status-change' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">{activity.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kitchen Performance Stats */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Orders Completed</span>
                <span className="text-sm font-medium">{summary.completed_today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-medium">
                  {summary.completed_today > 0 
                    ? `${Math.round((summary.completed_today / (summary.completed_today + summary.pending + summary.preparing + summary.ready)) * 100)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg. Order Value</span>
                <span className="text-sm font-medium">
                  ${summary.completed_today > 0 
                    ? (summary.total_revenue_today / summary.completed_today).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenDashboard
