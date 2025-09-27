import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';

interface Order {
  id: number;
  table_number: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
  items: OrderItem[];
  total: number;
  created_at: string;
  special_requests?: string;
}

interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  menu_item: {
    name: string;
    price: number;
  };
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  unavailable_reason?: string;
}

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  min_threshold: number;
  unit: string;
  last_updated: string;
}

export const ChefDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [eightySixList, setEightySixList] = useState<number[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'kitchen' | 'menu' | 'inventory'>('kitchen');
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket || null;

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    fetchInventory();

    if (socket) {
      socket.on('order-update', handleOrderUpdate);
      socket.on('new-order', handleNewOrder);
      socket.on('menu-update', handleMenuUpdate);
      socket.on('inventory-update', handleInventoryUpdate);
      socket.on('inventory-alert', handleInventoryAlert);
    }

    return () => {
      if (socket) {
        socket.off('order-update');
        socket.off('new-order');
        socket.off('menu-update');
        socket.off('inventory-update');
        socket.off('inventory-alert');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders/kitchen', {
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

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/menu');
      const data = await response.json();
      setMenuItems(data.menu || []);
      setEightySixList(data.eightySixList || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
  };

  const handleNewOrder = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  const handleMenuUpdate = (data: any) => {
    setMenuItems(data.menu || []);
    setEightySixList(data.eightySixList || []);
  };

  const handleInventoryUpdate = (data: any) => {
    setInventory(data.inventory || []);
  };

  const handleInventoryAlert = (alert: any) => {
    // Show notification for low inventory
    console.log('Inventory alert:', alert);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        handleOrderUpdate(updatedOrder);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const toggle86Item = async (itemId: number, reason?: string) => {
    try {
      const isCurrently86d = eightySixList.includes(itemId);
      const response = await fetch(`/api/menu/${itemId}/86`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          is_86d: !isCurrently86d,
          reason: reason || 'Temporarily unavailable'
        })
      });

      if (response.ok) {
        const data = await response.json();
        handleMenuUpdate(data);
      }
    } catch (error) {
      console.error('Failed to toggle 86 status:', error);
    }
  };

  const updateInventory = async (itemId: number, newStock: number) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ current_stock: newStock })
      });

      if (response.ok) {
        const updatedInventory = await response.json();
        handleInventoryUpdate(updatedInventory);
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
    }
  };

  const getOrderStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-red-100 text-red-800 border-red-200',
      preparing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      ready: 'bg-green-100 text-green-800 border-green-200',
      served: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getInventoryStatus = (item: InventoryItem) => {
    const percentage = (item.current_stock / item.min_threshold) * 100;
    if (percentage <= 25) return { status: 'Critical', color: 'bg-red-100 text-red-800' };
    if (percentage <= 50) return { status: 'Low', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Good', color: 'bg-green-100 text-green-800' };
  };

  const getOrderPriorityClass = (order: Order) => {
    const timeDiff = Date.now() - new Date(order.created_at).getTime();
    const minutesOld = timeDiff / (1000 * 60);
    
    if (minutesOld > 30) return 'border-l-4 border-l-red-500';
    if (minutesOld > 15) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-green-500';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chef Dashboard</h1>
        <p className="text-gray-600">Kitchen Operations & Menu Management</p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kitchen'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Kitchen Queue ({orders.filter(o => ['pending', 'preparing'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            86 List ({eightySixList.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventory ({inventory.filter(i => i.current_stock <= i.min_threshold).length} alerts)
          </button>
        </nav>
      </div>

      {activeTab === 'kitchen' && (
        <div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders
              .filter(order => ['pending', 'preparing', 'ready'].includes(order.status))
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((order) => (
              <div
                key={order.id}
                className={`p-4 rounded-lg border ${getOrderStatusColor(order.status)} ${getOrderPriorityClass(order)}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">Table {order.table_number}</h3>
                    <p className="text-sm opacity-75">Order #{order.id}</p>
                    <p className="text-xs opacity-60">
                      {new Date(order.created_at).toLocaleTimeString()} 
                      ({Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60))}m ago)
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                    {order.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">Items:</h4>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        <span className="font-medium">{item.quantity}x</span> {item.menu_item.name}
                      </div>
                    ))}
                  </div>
                </div>

                {order.special_requests && (
                  <div className="mb-4 p-2 bg-white bg-opacity-30 rounded text-sm">
                    <strong>Special:</strong> {order.special_requests}
                  </div>
                )}

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <div className="flex-1 px-3 py-2 bg-green-200 text-green-800 text-sm font-medium rounded text-center">
                      Ready for Pickup
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div>
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  86 List Management
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Items marked as 86'd will automatically become unavailable on all customer-facing displays in real-time.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {Object.entries(
              menuItems.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, MenuItem[]>)
            ).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">{category}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const is86d = eightySixList.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          is86d ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            is86d ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {is86d ? "86'd" : 'Available'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        <p className="text-lg font-bold text-green-600 mb-3">${item.price.toFixed(2)}</p>
                        
                        {item.unavailable_reason && (
                          <p className="text-sm text-red-600 mb-3 italic">
                            Reason: {item.unavailable_reason}
                          </p>
                        )}
                        
                        <button
                          onClick={() => toggle86Item(item.id, is86d ? undefined : 'Chef marked unavailable')}
                          className={`w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
                            is86d
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {is86d ? 'Remove from 86 List' : 'Add to 86 List'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-red-900">
                    {inventory.filter(i => (i.current_stock / i.min_threshold) <= 0.25).length}
                  </div>
                  <div className="text-sm text-red-700">Critical Items</div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-yellow-900">
                    {inventory.filter(i => {
                      const ratio = i.current_stock / i.min_threshold;
                      return ratio > 0.25 && ratio <= 0.5;
                    }).length}
                  </div>
                  <div className="text-sm text-yellow-700">Low Stock</div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-green-900">
                    {inventory.filter(i => (i.current_stock / i.min_threshold) > 0.5).length}
                  </div>
                  <div className="text-sm text-green-700">Well Stocked</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Inventory Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventory
                    .sort((a, b) => (a.current_stock / a.min_threshold) - (b.current_stock / b.min_threshold))
                    .map((item) => {
                      const status = getInventoryStatus(item);
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.current_stock} {item.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.min_threshold} {item.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                              {status.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.last_updated).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <input
                              type="number"
                              min="0"
                              defaultValue={item.current_stock}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              onBlur={(e) => {
                                const newStock = parseInt(e.target.value);
                                if (newStock !== item.current_stock && !isNaN(newStock)) {
                                  updateInventory(item.id, newStock);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};