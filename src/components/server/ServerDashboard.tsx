import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

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

export const ServerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [eightySixList, setEightySixList] = useState<number[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket || null;
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    if (socket) {
      socket.on('order-update', handleOrderUpdate);
      socket.on('new-order', handleNewOrder);
      socket.on('menu-update', handleMenuUpdate);
      socket.on('inventory-alert', handleInventoryAlert);
    }

    return () => {
      if (socket) {
        socket.off('order-update');
        socket.off('new-order');
        socket.off('menu-update');
        socket.off('inventory-alert');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
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

  const getOrderStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      served: 'bg-purple-100 text-purple-800',
      paid: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getItemAvailabilityStatus = (item: MenuItem) => {
    if (eightySixList.includes(item.id)) {
      return { status: '86\'d', color: 'text-red-600', available: false };
    }
    if (!item.is_available) {
      return { status: 'Unavailable', color: 'text-gray-500', available: false };
    }
    return { status: 'Available', color: 'text-green-600', available: true };
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Server Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}</p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Orders ({orders.filter(o => o.status !== 'paid').length})
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu Status ({eightySixList.length} items 86'd)
          </button>
        </nav>
      </div>

      {activeTab === 'orders' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Orders List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Current Orders</h2>
            <div className="space-y-4">
              {orders
                .filter(order => order.status !== 'paid')
                .map((order) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">Table {order.table_number}</h3>
                      <p className="text-sm text-gray-500">Order #{order.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {order.items.length} items • ${order.total.toFixed(2)}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div>
            {selectedOrder ? (
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Table {selectedOrder.table_number}</h2>
                    <p className="text-gray-500">Order #{selectedOrder.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b">
                        <div>
                          <span className="font-medium">{item.quantity}x {item.menu_item.name}</span>
                        </div>
                        <span>${(item.quantity * item.menu_item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 pt-2 border-t">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {selectedOrder.special_requests && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Special Requests</h3>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded-md">
                      {selectedOrder.special_requests}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Mark Preparing
                    </button>
                  )}
                  {selectedOrder.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'served')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mark Served
                    </button>
                  )}
                  {selectedOrder.status === 'served' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-500">
                Select an order to view details
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Menu Availability Status</h2>
          <div className="bg-white border rounded-lg p-6">
            <div className="mb-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live menu updates</span>
            </div>
            
            {Object.entries(
              menuItems.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, MenuItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold text-lg mb-3 border-b pb-2">{category}</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const status = getItemAvailabilityStatus(item);
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-md border ${
                          status.available ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{item.name}</span>
                          <span className={`text-sm font-medium ${status.color}`}>
                            {status.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          ${item.price.toFixed(2)}
                        </div>
                        {item.unavailable_reason && (
                          <div className="text-xs text-red-600 mt-1 italic">
                            {item.unavailable_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};