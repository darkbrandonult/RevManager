import React, { useState, useEffect } from 'react';

interface Order {
  id: number;
  table: string;
  items: string[];
  status: 'pending' | 'preparing' | 'ready' | 'served';
  time: string;
  customer?: string;
}

const SimpleKitchenView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Simulate API call with demo data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const demoOrders: Order[] = [
          {
            id: 1,
            table: 'Table 5',
            items: ['Classic Burger', 'Fries', 'Coke'],
            status: 'preparing',
            time: '10 mins ago',
            customer: 'John D.'
          },
          {
            id: 2,
            table: 'Table 2',
            items: ['Margherita Pizza', 'Caesar Salad'],
            status: 'pending',
            time: '5 mins ago',
            customer: 'Sarah M.'
          },
          {
            id: 3,
            table: 'Table 8',
            items: ['Grilled Salmon', 'Steamed Vegetables'],
            status: 'ready',
            time: '15 mins ago',
            customer: 'Mike R.'
          },
          {
            id: 4,
            table: 'Table 1',
            items: ['Pasta Carbonara', 'Garlic Bread'],
            status: 'preparing',
            time: '8 mins ago',
            customer: 'Emma T.'
          }
        ];
        
        setOrders(demoOrders);
        setError('');
      } catch (err) {
        setError('Failed to load kitchen orders');
        console.error('Kitchen orders fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const updateOrderStatus = (orderId: number, newStatus: Order['status']) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'served':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {} as Record<Order['status'], Order[]>);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🍳 Kitchen</h1>
          <p className="mt-2 text-gray-600">Active orders and cooking queue</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {(['pending', 'preparing', 'ready', 'served'] as const).map((status) => (
            <div key={status} className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {status} Orders ({groupedOrders[status]?.length || 0})
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {(groupedOrders[status] || []).map((order) => (
                  <div key={order.id} className={`p-4 border rounded-lg ${getStatusColor(order.status)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{order.table}</h3>
                        <p className="text-sm opacity-75">{order.customer}</p>
                      </div>
                      <span className="text-xs opacity-75">{order.time}</span>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm">
                          • {item}
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      {status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Start Cooking
                        </button>
                      )}
                      {status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Mark Ready
                        </button>
                      )}
                      {status === 'ready' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'served')}
                          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Mark Served
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(!groupedOrders[status] || groupedOrders[status].length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">✨</div>
                    <p className="text-sm">No {status} orders</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleKitchenView;