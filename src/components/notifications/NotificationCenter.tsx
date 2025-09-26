import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      // Listen for different types of real-time notifications
      socket.on('inventory-alert', handleInventoryAlert);
      socket.on('order-update', handleOrderNotification);
      socket.on('menu-update', handleMenuNotification);
      socket.on('low-stock-warning', handleLowStockWarning);
      socket.on('system-alert', handleSystemAlert);
    }

    return () => {
      if (socket) {
        socket.off('inventory-alert');
        socket.off('order-update');
        socket.off('menu-update');
        socket.off('low-stock-warning');
        socket.off('system-alert');
      }
    };
  }, [socket]);

  const handleInventoryAlert = (data: any) => {
    if (!shouldReceiveNotification('inventory')) return;
    
    addNotification({
      type: 'warning',
      title: 'Inventory Alert',
      message: `${data.item_name} is running low (${data.current_stock} ${data.unit} remaining)`,
      action: {
        label: 'View Inventory',
        onClick: () => {
          // Navigate to inventory management
          console.log('Navigate to inventory');
        }
      }
    });
  };

  const handleOrderNotification = (data: any) => {
    if (!shouldReceiveNotification('orders')) return;

    let message = '';
    let type: 'info' | 'success' = 'info';

    switch (data.status) {
      case 'pending':
        message = `New order #${data.id} for Table ${data.table_number}`;
        break;
      case 'ready':
        message = `Order #${data.id} is ready for pickup`;
        type = 'success';
        break;
      case 'paid':
        message = `Order #${data.id} has been completed`;
        type = 'success';
        break;
    }

    if (message) {
      addNotification({
        type,
        title: 'Order Update',
        message
      });
    }
  };

  const handleMenuNotification = (data: any) => {
    if (!shouldReceiveNotification('menu')) return;

    const message = data.type === 'item-86ed' 
      ? `${data.item_name} has been 86'd and is no longer available`
      : `Menu has been updated`;

    addNotification({
      type: 'info',
      title: 'Menu Update',
      message
    });
  };

  const handleLowStockWarning = (data: any) => {
    if (!shouldReceiveNotification('inventory')) return;

    addNotification({
      type: 'error',
      title: 'Critical Stock Level',
      message: `${data.item_name} is critically low and may cause menu items to be 86'd`,
      action: {
        label: 'Restock Now',
        onClick: () => {
          console.log('Navigate to restock');
        }
      }
    });
  };

  const handleSystemAlert = (data: any) => {
    addNotification({
      type: 'error',
      title: 'System Alert',
      message: data.message
    });
  };

  const shouldReceiveNotification = (type: string): boolean => {
    if (!user) return false;

    const rolePermissions = {
      customer: [],
      server: ['orders', 'menu'],
      chef: ['orders', 'menu', 'inventory'],
      manager: ['orders', 'menu', 'inventory', 'system'],
      owner: ['orders', 'menu', 'inventory', 'system']
    };

    return rolePermissions[user.role]?.includes(type) ?? false;
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only last 10
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      info: (
        <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      error: (
        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
    return icons[type as keyof typeof icons] || icons.info;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-7L15 17zm-4.5 0L9 10l-1.5 7h3zm-3.5 0H2l3.5-7L7 17z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <svg className="h-12 w-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-7L15 17zm-4.5 0L9 10l-1.5 7h3zm-3.5 0H2l3.5-7L7 17z" />
                </svg>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                      {notification.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            notification.action!.onClick();
                            setIsOpen(false);
                          }}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};