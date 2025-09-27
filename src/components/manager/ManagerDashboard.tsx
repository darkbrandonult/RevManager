import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'server' | 'chef' | 'manager' | 'owner';
  status: 'active' | 'inactive';
  created_at: string;
  last_login?: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  created_at: string;
}

interface Order {
  id: number;
  table_number: string;
  status: string;
  total: number;
  created_at: string;
}

interface AnalyticsData {
  daily_revenue: number;
  daily_orders: number;
  avg_order_value: number;
  popular_items: { name: string; count: number }[];
  revenue_trend: { date: string; revenue: number }[];
  order_trend: { date: string; orders: number }[];
}

export const ManagerDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'staff' | 'reports'>('overview');
  const [isAddingMenuItem, setIsAddingMenuItem] = useState(false);
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket || null;
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchMenu();
    fetchOrders();
    fetchAnalytics();

    if (socket) {
      socket.on('user-update', handleUserUpdate);
      socket.on('menu-update', handleMenuUpdate);
      socket.on('order-update', handleOrderUpdate);
      socket.on('analytics-update', handleAnalyticsUpdate);
    }

    return () => {
      if (socket) {
        socket.off('user-update');
        socket.off('menu-update');
        socket.off('order-update');
        socket.off('analytics-update');
      }
    };
  }, [socket]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
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

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
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

  const handleMenuUpdate = (data: any) => {
    setMenuItems(data.menu || []);
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleAnalyticsUpdate = (data: AnalyticsData) => {
    setAnalytics(data);
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
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

  const toggleUserStatus = async (userId: number, newStatus: 'active' | 'inactive') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        handleUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const addMenuItem = async (item: Partial<MenuItem>) => {
    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        const newItem = await response.json();
        setMenuItems(prev => [...prev, newItem]);
        setIsAddingMenuItem(false);
      }
    } catch (error) {
      console.error('Failed to add menu item:', error);
    }
  };

  const updateMenuItem = async (itemId: number, updates: Partial<MenuItem>) => {
    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setMenuItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
      }
    } catch (error) {
      console.error('Failed to update menu item:', error);
    }
  };

  const deleteMenuItem = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        const response = await fetch(`/api/menu/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setMenuItems(prev => prev.filter(item => item.id !== itemId));
        }
      } catch (error) {
        console.error('Failed to delete menu item:', error);
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name} • Restaurant Management & Analytics</p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu Management ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'staff'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Staff Management ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reports & Analytics
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && analytics && (
        <div className="grid gap-6">
          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${analytics.daily_revenue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Today's Revenue</div>
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
                    {analytics.daily_orders}
                  </div>
                  <div className="text-sm text-gray-500">Orders Today</div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${analytics.avg_order_value.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Avg Order Value</div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-500">Active Staff</div>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Items */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Popular Items Today</h3>
            <div className="space-y-3">
              {analytics.popular_items.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm">
                    {item.count} orders
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.table_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Menu Management</h2>
            <button
              onClick={() => setIsAddingMenuItem(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add Menu Item
            </button>
          </div>

          {isAddingMenuItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Add New Menu Item</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const item = {
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    price: parseFloat(formData.get('price') as string),
                    category: formData.get('category') as string,
                    is_available: true
                  };
                  addMenuItem(item);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        name="description"
                        required
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price</label>
                      <input
                        type="number"
                        name="price"
                        step="0.01"
                        min="0"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        name="category"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select category</option>
                        <option value="Appetizers">Appetizers</option>
                        <option value="Main Courses">Main Courses</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Beverages">Beverages</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Add Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingMenuItem(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <p className="text-lg font-bold text-green-600 mb-3">${item.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mb-4">{item.category}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateMenuItem(item.id, { is_available: !item.is_available })}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      item.is_available
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {item.is_available ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.id)}
                    className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Staff Management</h2>
            <p className="text-gray-600">Manage user roles and access permissions</p>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                        {user?.role === 'owner' && <option value="owner">Owner</option>}
                      </select>
                      <button
                        onClick={() => toggleUserStatus(
                          staffUser.id, 
                          staffUser.status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          staffUser.status === 'active'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {staffUser.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && analytics && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Reports & Analytics</h2>
          
          <div className="grid gap-6">
            {/* Revenue Trend */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 7 Days)</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.revenue_trend.map((day, index) => {
                  const maxRevenue = Math.max(...analytics.revenue_trend.map(d => d.revenue));
                  const height = (day.revenue / maxRevenue) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-indigo-600 rounded-t w-full"
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

            {/* Order Volume */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Order Volume (Last 7 Days)</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.order_trend.map((day, index) => {
                  const maxOrders = Math.max(...analytics.order_trend.map(d => d.orders));
                  const height = (day.orders / maxOrders) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-green-600 rounded-t w-full"
                        style={{ height: `${height}%` }}
                        title={`${day.orders} orders`}
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Performing Items</h3>
              <div className="space-y-4">
                {analytics.popular_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="ml-3 font-medium">{item.name}</span>
                    </div>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {item.count} sold
                    </span>
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