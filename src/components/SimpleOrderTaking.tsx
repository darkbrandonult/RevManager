import React, { useState, useEffect } from 'react';
import { menuItems as fallbackMenuItems } from '../data/menuData';

interface MenuItem {
  id: number;
  name: string;
  price: string | number;
  category: string;
  description: string;
  is_available: boolean;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

const SimpleOrderTaking: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'fast'>('fast');

  // Helper function to parse price as number
  const parsePrice = (price: string | number): number => {
    return typeof price === 'string' ? parseFloat(price) : price;
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      console.log('Fetching menu items...');
      const response = await fetch('/api/menu');
      console.log('Menu response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Menu data received:', data);
        
        // If API returns few items (less than 10), use the comprehensive fallback menu
        if (data.length < 10) {
          console.log('🔄 API returned few items, using comprehensive menu from menuData.ts');
          const availableItems = fallbackMenuItems.filter((item: MenuItem) => item.is_available);
          console.log('Available fallback menu items:', availableItems.length);
          setMenuItems(availableItems);
        } else {
          const availableItems = data.filter((item: MenuItem) => item.is_available);
          console.log('Available menu items:', availableItems);
          setMenuItems(availableItems);
        }
      } else {
        console.error('Failed to fetch menu:', response.status);
        // Fallback to menuData.ts on API failure
        console.log('🔄 API failed, using comprehensive menu from menuData.ts');
        const availableItems = fallbackMenuItems.filter((item: MenuItem) => item.is_available);
        setMenuItems(availableItems);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      // Fallback to menuData.ts on error
      console.log('🔄 Error occurred, using comprehensive menu from menuData.ts');
      const availableItems = fallbackMenuItems.filter((item: MenuItem) => item.is_available);
      setMenuItems(availableItems);
    }
  };

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToOrder = (menuItem: MenuItem) => {
    console.log('Adding item to order:', menuItem.name);
    const existingItem = currentOrder.find(item => item.menuItem.id === menuItem.id);
    
    if (existingItem) {
      const newOrder = currentOrder.map(item =>
        item.menuItem.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCurrentOrder(newOrder);
      console.log('Updated existing item, new order:', newOrder);
    } else {
      const newOrder = [...currentOrder, { menuItem, quantity: 1 }];
      setCurrentOrder(newOrder);
      console.log('Added new item, new order:', newOrder);
    }
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCurrentOrder(currentOrder.filter(item => item.menuItem.id !== menuItemId));
    } else {
      setCurrentOrder(currentOrder.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const updateItemNotes = (menuItemId: number, notes: string) => {
    setCurrentOrder(currentOrder.map(item =>
      item.menuItem.id === menuItemId
        ? { ...item, notes }
        : item
    ));
  };

  const calculateTotal = () => {
    return currentOrder.reduce((total, item) => total + (parsePrice(item.menuItem.price) * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (!tableNumber || currentOrder.length === 0) {
      alert('Please enter a table number and add items to the order');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate total amount
      const totalAmount = currentOrder.reduce((total, item) => {
        return total + (parsePrice(item.menuItem.price) * item.quantity);
      }, 0);

      const orderData = {
        customer_name: customerName || `Table ${tableNumber}`,
        notes: orderNotes || null,
        total_amount: totalAmount,
        items: currentOrder.map(item => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          price: parsePrice(item.menuItem.price),
          notes: item.notes || null
        }))
      };

      console.log('Submitting order data:', orderData);

      const token = localStorage.getItem('token');
      console.log('Auth token exists:', !!token);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Order created successfully:', result);
        alert('Order submitted successfully!');
        // Reset form
        setCurrentOrder([]);
        setTableNumber('');
        setCustomerName('');
        setOrderNotes('');
      } else {
        const error = await response.json();
        console.error('Order submission error:', error);
        alert(`Error submitting order: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Error submitting order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 Take New Order</h1>
        <p className="text-gray-600">Add items to create a new customer order</p>
        {menuItems.length === 0 && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <strong>Note:</strong> Menu items are loading... ({menuItems.length} items available)
          </div>
        )}
        
        {/* Quick Test Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTableNumber('99')}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            🧪 Set Test Table (99)
          </button>
          <button
            onClick={() => {
              if (menuItems.length > 0) {
                addToOrder(menuItems[0]);
                console.log('Added test item:', menuItems[0]);
              }
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
          >
            🧪 Add Test Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Menu Items</h2>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('fast')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'fast'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🚀 Fast Order
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Detailed View
                </button>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fast Order Mode */}
            {viewMode === 'fast' && (
              <div className="space-y-2">
                {filteredItems.map(item => {
                  const orderItem = currentOrder.find(oi => oi.menuItem.id === item.id);
                  const quantity = orderItem?.quantity || 0;
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <span className="text-lg font-bold text-green-600">${parsePrice(item.price).toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <button
                          onClick={() => quantity > 0 && updateQuantity(item.id, quantity - 1)}
                          disabled={quantity === 0}
                          className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => addToOrder(item)}
                          className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Detailed Grid Mode */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className="text-lg font-bold text-green-600">${parsePrice(item.price).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <button
                      onClick={() => addToOrder(item)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                    >
                      Add to Order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Order Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="table-number" className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <input
                  id="table-number"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter table number"
                  min="1"
                />
              </div>
              
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Order Notes (Optional)
                </label>
                <textarea
                  id="order-notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any special instructions..."
                />
              </div>
            </div>
          </div>

          {/* Current Order */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current Order</h2>
            
            {currentOrder.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {currentOrder.map(item => (
                  <div key={item.menuItem.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.menuItem.name}</h4>
                      <span className="font-bold">${(parsePrice(item.menuItem.price) * item.quantity).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        className="bg-gray-200 text-gray-600 w-8 h-8 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        className="bg-gray-200 text-gray-600 w-8 h-8 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Item notes..."
                    />
                  </div>
                ))}
                
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Enhanced Debug Info */}
            
            
            <button
              onClick={submitOrder}
              disabled={isSubmitting || currentOrder.length === 0 || !tableNumber}
              className={`w-full mt-4 py-3 px-4 rounded-lg font-medium transition-colors ${
                isSubmitting || currentOrder.length === 0 || !tableNumber
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Order'}
            </button>
            
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleOrderTaking;