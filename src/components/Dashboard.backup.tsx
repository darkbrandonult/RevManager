import { useAuth } from '../contexts/AuthContext'
import { useRoleAccess } from '../hooks/useApi'
import NotificationCenter from './NotificationCenter'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const { roles, permissions } = useRoleAccess()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Please log in to access the dashboard.</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const getRoleDashboard = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Management Features */}
        {permissions.canManageUsers() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👥</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                  User Management
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Manage staff accounts, roles, and permissions
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200">
                    Manage Staff
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 transition-all duration-200">
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Management */}
        {permissions.canManageInventory() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📦</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-success-600 transition-colors">
                  Inventory Control
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Monitor stock levels, update quantities, and manage par levels
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 transition-all duration-200">
                    View Inventory
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-warning-100 text-warning-800 text-sm font-medium rounded-lg hover:bg-warning-200 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 transition-all duration-200">
                    <span className="w-2 h-2 bg-warning-500 rounded-full mr-2 animate-pulse"></span>
                    Low Stock Alerts
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Management */}
        {permissions.canManageMenu() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🍽️</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Menu Management
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Update menu items, manage 86 list, and control availability
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200">
                    Edit Menu
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-danger-600 text-white text-sm font-medium rounded-lg hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 transition-all duration-200">
                    86 List
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Management */}
        {permissions.canManageOrders() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📋</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                  Order Management
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {roles.isKitchenStaff() 
                    ? "View kitchen queue, update order status, and manage preparation"
                    : "Track all orders, manage customer requests, and coordinate service"
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  {roles.isKitchenStaff() && (
                    <button className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200">
                      Kitchen Queue
                    </button>
                  )}
                  <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200">
                    All Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports & Analytics */}
        {permissions.canViewReports() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  Reports & Analytics
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  View sales data, performance metrics, and business insights
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200">
                    Sales Reports
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200">
                    Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Scheduling */}
        {permissions.canManageUsers() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📅</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                  Staff Scheduling
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Create shifts, assign staff, and manage schedule requests
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => window.location.href = '/schedule'}
                    className="inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Schedule Planner
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-800 text-sm font-medium rounded-lg hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200">
                    Time Off Requests
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-lg hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200">
                    Shift Swaps
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tip Management */}
        {(roles.isManager() || roles.isOwner()) && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
                  Tip Pool Management
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Calculate tip pools, manage distribution rules, and track payouts
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => window.location.href = '/tips/management'}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Tip Pool Manager
                  </button>
                  <button 
                    onClick={() => window.location.href = '/tips'}
                    className="inline-flex items-center px-4 py-2 bg-warning-100 text-warning-800 text-sm font-medium rounded-lg hover:bg-warning-200 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    View Tips
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {(roles.isManager() || roles.isOwner()) && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  Admin Dashboard
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Analytics, KPIs, user management, and comprehensive restaurant metrics
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Analytics & KPIs
                  </button>
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-lg hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    User Management
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Tip Tracker - For all staff */}
        <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">💸</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                My Tips
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Track your personal tip earnings and payout history
              </p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => window.location.href = '/tips'}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
                >
                  View My Tips
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Server-specific features */}
        {roles.isServer() && (
          <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🍴</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-pink-600 transition-colors">
                  Server Tools
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Manage tables, process orders, and communicate with kitchen
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200">
                    Table Management
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-cyan-100 text-cyan-800 text-sm font-medium rounded-lg hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200">
                    Team Messages
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            {/* Brand & Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RM</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  RevManager
                </h1>
                <p className="text-sm text-slate-600 hidden sm:block">
                  Restaurant Management System
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
              <NotificationCenter />
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role}
                  </p>
                </div>
                
                {/* Avatar */}
                <div className="w-8 h-8 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">👋</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Welcome back, {user.firstName}! 👋
                </h2>
                <p className="text-slate-600 mt-2">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
                </p>
              </div>
              
              {/* Quick Stats for Management */}
              {(roles.isManager() || roles.isOwner()) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold">$2,450</div>
                    <div className="text-xs opacity-90">Daily Sales</div>
                    <div className="text-xs opacity-75">+12% vs yesterday</div>
                  </div>
                  <div className="bg-gradient-to-r from-success-500 to-success-600 text-white p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold">87</div>
                    <div className="text-xs opacity-90">Orders Today</div>
                    <div className="text-xs opacity-75">5 pending</div>
                  </div>
                  <div className="bg-gradient-to-r from-warning-500 to-warning-600 text-white p-4 rounded-xl text-center col-span-2 sm:col-span-1">
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-xs opacity-90">Low Stock Items</div>
                    <div className="text-xs opacity-75">Need attention</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Role-based Dashboard Content */}
          {getRoleDashboard()}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
