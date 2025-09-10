import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface KPIMetrics {
  revenue: {
    today: number
    weekTotal: number
    changePercent: number
  }
  tableTurnover: {
    activeTables: number
    totalOrders: number
    turnoverRate: number
  }
  topItems: Array<{
    name: string
    price: number
    ordersCount: number
    totalQuantity: number
    totalRevenue: number
  }>
  staff: {
    totalStaff: number
    activeStaff: number
    avgHours: number
    totalTips: number
  }
  alerts: {
    totalAlerts: number
    criticalAlerts: number
    warningAlerts: number
  }
}

interface SalesChartData {
  period: string
  timestamp: string
  ordersCount: number
  revenue: number
  tips: number
  totalSales: number
}

interface LaborAnalysisData {
  date: string
  totalHours: number
  laborCost: number
  revenue: number
  laborCostPercentage: number
}

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
  totalShifts: number
  lastShift: string | null
  totalTipsEarned: number
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null)
  const [salesData, setSalesData] = useState<SalesChartData[]>([])
  const [laborData, setLaborData] = useState<LaborAnalysisData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'users'>('overview')
  const [chartPeriod, setChartPeriod] = useState('7days')
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'server'
  })

  const { user } = useAuth()
  const socket = useSocket()

  const isOwnerOrManager = user?.role && ['owner', 'manager'].includes(user.role)

  useEffect(() => {
    if (isOwnerOrManager) {
      fetchMetrics()
      fetchSalesData()
      fetchLaborData()
      fetchUsers()
    }
  }, [isOwnerOrManager, chartPeriod])

  useEffect(() => {
    if (socket && isOwnerOrManager) {
      socket.on('user-created', handleUserUpdate)
      socket.on('user-updated', handleUserUpdate)
      socket.on('user-deleted', handleUserUpdate)
      socket.on('order-completed', handleOrderUpdate)

      return () => {
        socket.off('user-created', handleUserUpdate)
        socket.off('user-updated', handleUserUpdate)
        socket.off('user-deleted', handleUserUpdate)
        socket.off('order-completed', handleOrderUpdate)
      }
    }
  }, [socket, isOwnerOrManager])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const fetchSalesData = async () => {
    try {
      const response = await fetch(`/api/admin/sales-chart?period=${chartPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSalesData(data)
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
    }
  }

  const fetchLaborData = async () => {
    try {
      const response = await fetch(`/api/admin/labor-analysis?period=${chartPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLaborData(data)
      }
    } catch (error) {
      console.error('Error fetching labor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleUserUpdate = () => {
    fetchUsers()
    fetchMetrics()
  }

  const handleOrderUpdate = () => {
    fetchMetrics()
    fetchSalesData()
  }

  const createUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        setShowUserModal(false)
        setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'server' })
        fetchUsers()
        alert('User created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user')
    }
  }

  const updateUser = async (userId: number, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        fetchUsers()
        alert('User updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    }
  }

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchUsers()
        alert('User deactivated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to deactivate user')
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      alert('Failed to deactivate user')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return '📈'
    if (changePercent < 0) return '📉'
    return '➖'
  }

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600'
    if (changePercent < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (!isOwnerOrManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-danger-600 text-2xl">🚫</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-6 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-slate-600">
                Restaurant management and analytics
              </p>
            </div>
            
            {/* Real-time indicator */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center px-3 py-1.5 bg-success-100 text-success-800 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
                Live Data
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 mb-6 sm:mb-8 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto">
              {(['overview', 'analytics', 'users'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-lg">
                      {tab === 'overview' && '📊'}
                      {tab === 'analytics' && '📈'}
                      {tab === 'users' && '👥'}
                    </span>
                    <span className="capitalize">{tab}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6 sm:space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Revenue Card */}
              <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">Today's Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {formatCurrency(metrics.revenue.today)}
                    </p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeColor(metrics.revenue.changePercent)}`}>
                      <span className="mr-1">{getChangeIcon(metrics.revenue.changePercent)}</span>
                      <span>
                        {Math.abs(metrics.revenue.changePercent)}% vs daily avg
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">💰</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Turnover Card */}
              <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">Table Turnover</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {metrics.tableTurnover.turnoverRate}
                    </p>
                    <p className="text-xs text-slate-500">
                      {metrics.tableTurnover.totalOrders} orders / {metrics.tableTurnover.activeTables} tables
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">🍽️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Card */}
              <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Staff</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {metrics.staff.activeStaff}/{metrics.staff.totalStaff}
                    </p>
                    <p className="text-xs text-slate-500">
                      Avg {metrics.staff.avgHours.toFixed(1)}h today
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">👥</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts Card */}
              <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Alerts</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      {metrics.alerts.totalAlerts}
                    </p>
                    <p className="text-xs text-slate-500">
                      {metrics.alerts.criticalAlerts} critical, {metrics.alerts.warningAlerts} warning
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-danger-500 to-danger-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xl">🚨</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Selling Items */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Top Selling Items Today</h3>
              {metrics.topItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-slate-400 text-xl">📊</span>
                  </div>
                  <p className="text-slate-500">No orders today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.topItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            {item.totalQuantity} sold • {item.ordersCount} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(item.totalRevenue)}</p>
                        <p className="text-sm text-slate-500">{formatCurrency(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sales Analytics</h2>
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Sales Over Time Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Sales Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: any, name: string) => [formatCurrency(value), name]} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalSales"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Total Sales"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="tips"
                  stackId="3"
                  stroke="#ffc658"
                  fill="#ffc658"
                  name="Tips"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Labor Cost vs Revenue */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Labor Cost Analysis</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={laborData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Labor Cost %') return [`${value}%`, name]
                    return [formatCurrency(value), name]
                  }} 
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#8884d8"
                  name="Revenue"
                />
                <Bar
                  yAxisId="left"
                  dataKey="laborCost"
                  fill="#82ca9d"
                  name="Labor Cost"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="laborCostPercentage"
                  stroke="#ff7300"
                  strokeWidth={3}
                  name="Labor Cost %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Management</h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add New User
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.isActive ? '' : 'opacity-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'chef' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{user.totalShifts} shifts</div>
                        <div>{formatCurrency(user.totalTipsEarned)} tips earned</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {user.id !== user.id && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Create New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Password"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="John"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="server">Server</option>
                  <option value="chef">Chef</option>
                  <option value="manager">Manager</option>
                  {user?.role === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
      </div> {/* End Container */}
    </div>
  )
}

export default AdminDashboard
