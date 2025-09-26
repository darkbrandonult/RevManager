import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../../contexts/SocketContext';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  unavailable_reason?: string;
}

export const CustomerMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [eightySixList, setEightySixList] = useState<number[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    fetchMenu();

    if (socket) {
      socket.on('menu-update', handleMenuUpdate);
      socket.on('menu-bulk-update', handleBulkUpdate);
    }

    return () => {
      if (socket) {
        socket.off('menu-update');
        socket.off('menu-bulk-update');
      }
    };
  }, [socket]);

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

  const handleMenuUpdate = (data: any) => {
    setMenuItems(data.menu || []);
    setEightySixList(data.eightySixList || []);
    setLastUpdate(new Date());
  };

  const handleBulkUpdate = (data: any) => {
    setMenuItems(data.menu || []);
    setEightySixList(data.eightySixList || []);
    setLastUpdate(new Date());
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const getItemStatus = (item: MenuItem) => {
    if (eightySixList.includes(item.id)) {
      return { status: '86\'d', color: 'bg-red-100 text-red-800', reason: item.unavailable_reason };
    }
    if (!item.is_available) {
      return { status: 'Unavailable', color: 'bg-gray-100 text-gray-800', reason: item.unavailable_reason };
    }
    return { status: 'Available', color: 'bg-green-100 text-green-800', reason: null };
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Live Menu</h1>
          <div className="text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live updates • Last: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Menu availability updates in real-time. Items may become unavailable due to inventory or kitchen capacity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
            {category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const itemStatus = getItemStatus(item);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${
                    itemStatus.status === 'Available' 
                      ? 'border-green-200 bg-white' 
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${itemStatus.color}`}>
                      {itemStatus.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">
                      ${item.price.toFixed(2)}
                    </span>
                    
                    {itemStatus.status === 'Available' ? (
                      <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
                        Add to Order
                      </button>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {itemStatus.reason && (
                          <p className="italic">{itemStatus.reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};