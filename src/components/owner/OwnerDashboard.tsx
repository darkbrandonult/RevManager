import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';
import { AuthContext } from '../../contexts/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'server' | 'chef' | 'manager' | 'owner';
  status: 'active' | 'inactive';
  created_at: string;
  last_login?: string;
}

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  table_name: string;
  record_id: number;
  old_values?: any;
  new_values?: any;
  timestamp: string;
  user: {
    name: string;
    email: string;
  };
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_orders: number;
  total_revenue: number;
  orders_today: number;
  revenue_today: number;
  avg_order_value: number;
  menu_items_count: number;
  inventory_items_count: number;
  low_inventory_count: number;
}

interface AnalyticsData {
  daily_revenue: number;
  daily_orders: number;
  avg_order_value: number;
  popular_items: { name: string; count: number }[];
  revenue_trend: { date: string; revenue: number }[];
  order_trend: { date: string; orders: number }[];
  user_activity: { date: string; active_users: number }[];
}

export const OwnerDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'analytics'>('overview');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
    fetchSystemStats();
    fetchAnalytics();

    if (socket) {
      socket.on('user-update', handleUserUpdate);
      socket.on('audit-log', handleNewAuditLog);
      socket.on('system-stats-update', handleSystemStatsUpdate);
      socket.on('analytics-update', handleAnalyticsUpdate);
    }

    return () => {
      if (socket) {
        socket.off('user-update');
        socket.off('audit-log');
        socket.off('system-stats-update');
        socket.off('analytics-update');
      }
    };
  }, [socket]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/owner/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/owner/audit-logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/owner/system-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSystemStats(data);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/owner/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleNewAuditLog = (newLog: AuditLog) => {
    setAuditLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep only last 100 logs
  };

  const handleSystemStatsUpdate = (stats: SystemStats) => {
    setSystemStats(stats);
  };

  const handleAnalyticsUpdate = (data: AnalyticsData) => {
    setAnalytics(data);
  };

  const createUser = async (userData: Partial<User>) => {
    try {
      const response = await fetch('/api/owner/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
        setIsAddingUser(false);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/owner/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        handleUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/owner/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setUsers(prev => prev.filter(u => u.id !== userId));
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      chef: 'bg-green-100 text-green-800',
      server: 'bg-yellow-100 text-yellow-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getActionColor = (action: string) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Owner Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name} • Complete System Administration & Analytics
        </p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            User Management ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Advanced Analytics
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && systemStats && (
        <div className="grid gap-6">
          {/* System Health Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {systemStats.total_users}
                  </div>
                  <div className="text-sm text-gray-500">Total Users</div>
                  <div className="text-xs text-green-600">
                    {systemStats.active_users} active
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${systemStats.total_revenue.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-500">Total Revenue</div>
                  <div className="text-xs text-green-600">
                    ${systemStats.revenue_today.toFixed(0)} today
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {systemStats.total_orders}
                  </div>
                  <div className="text-sm text-gray-500">Total Orders</div>
                  <div className="text-xs text-blue-600">
                    {systemStats.orders_today} today
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {systemStats.menu_items_count}
                  </div>
                  <div className="text-sm text-gray-500">Menu Items</div>
                  <div className="text-xs text-indigo-600">
                    {systemStats.inventory_items_count} inventory items
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          {systemStats.low_inventory_count > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    System Alert: Low Inventory
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {systemStats.low_inventory_count} inventory items are running low and may affect menu availability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Distribution */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">User Role Distribution</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {['owner', 'manager', 'chef', 'server'].map(role => {
                const count = users.filter(u => u.role === role && u.status === 'active').length;
                return (
                  <div key={role} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                      {role.toUpperCase()}S
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Average Order Value</h3>
              <div className="text-3xl font-bold text-green-600">${systemStats.avg_order_value.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-2">
                Based on {systemStats.total_orders} total orders
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="text-sm text-green-600 font-medium">Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Real-time Updates</span>
                  <span className="text-sm text-green-600 font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Sessions</span>
                  <span className="text-sm text-blue-600 font-medium">{systemStats.active_users}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Management</h2>
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add User
            </button>
          </div>

          {isAddingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Add New User</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const userData = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    role: formData.get('role') as string,
                    password: formData.get('password') as string,
                    status: 'active'
                  };
                  createUser(userData);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        id="role"
                        name="role"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select role</option>
                        <option value="server">Server</option>
                        <option value="chef">Chef</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((staffUser) => (
                  <tr key={staffUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{staffUser.name}</div>
                        <div className="text-sm text-gray-500">{staffUser.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(staffUser.role)}`}>
                        {staffUser.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(staffUser.status)}`}>
                        {staffUser.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(staffUser.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {staffUser.last_login 
                        ? new Date(staffUser.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <select
                        value={staffUser.role}
                        onChange={(e) => updateUserRole(staffUser.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="server">Server</option>
                        <option value="chef">Chef</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        onClick={() => deleteUser(staffUser.id)}
                        className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Audit Trail</h2>
            <p className="text-gray-600">Complete log of all system changes and user actions</p>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user.name}</div>
                        <div className="text-sm text-gray-500">{log.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.table_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{log.record_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.new_values && (
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => {
                            alert(`Old: ${JSON.stringify(log.old_values, null, 2)}\n\nNew: ${JSON.stringify(log.new_values, null, 2)}`);
                          }}
                        >
                          View Changes
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

      {activeTab === 'analytics' && analytics && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Advanced Analytics</h2>
          
          <div className="grid gap-6">
            {/* Revenue Trends */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend (7 Days)</h3>
                <div className="h-64 flex items-end space-x-2">
                  {analytics.revenue_trend.map((day, index) => {
                    const maxRevenue = Math.max(...analytics.revenue_trend.map(d => d.revenue));
                    const height = (day.revenue / maxRevenue) * 100;
                    return (
                      <div key={`revenue-${index}`} className="flex-1 flex flex-col items-center">
                        <div
                          className="bg-purple-600 rounded-t w-full"
                          style={{ height: `${height}%` }}
                          title={`$${day.revenue.toFixed(2)}`}
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">User Activity (7 Days)</h3>
                <div className="h-64 flex items-end space-x-2">
                  {analytics.user_activity.map((day, index) => {
                    const maxActivity = Math.max(...analytics.user_activity.map(d => d.active_users));
                    const height = (day.active_users / maxActivity) * 100;
                    return (
                      <div key={`activity-${index}`} className="flex-1 flex flex-col items-center">
                        <div
                          className="bg-indigo-600 rounded-t w-full"
                          style={{ height: `${height}%` }}
                          title={`${day.active_users} active users`}
                        />
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">${analytics.avg_order_value.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Avg Order Value</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{analytics.daily_orders}</div>
                  <div className="text-sm text-gray-500">Orders Today</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">${analytics.daily_revenue.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Revenue Today</div>
                </div>
              </div>
            </div>

            {/* Top Performing Items */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Performing Items</h3>
              <div className="space-y-4">
                {analytics.popular_items.slice(0, 10).map((item, index) => (
                  <div key={`item-${index}`} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="ml-3 font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {item.count} sold
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};