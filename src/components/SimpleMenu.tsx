import React, { useState, useEffect } from 'react';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  image?: string;
}

const SimpleMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        // Simulate API call with demo data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const demoMenu: MenuItem[] = [
          {
            id: 1,
            name: "Classic Burger",
            category: "Mains",
            price: 12.99,
            description: "Juicy beef patty with lettuce, tomato, and special sauce",
            available: true,
            image: "🍔"
          },
          {
            id: 2,
            name: "Margherita Pizza",
            category: "Mains", 
            price: 14.99,
            description: "Fresh mozzarella, tomatoes, and basil on crispy crust",
            available: true,
            image: "🍕"
          },
          {
            id: 3,
            name: "Caesar Salad",
            category: "Salads",
            price: 8.99,
            description: "Crisp romaine lettuce with parmesan and croutons",
            available: true,
            image: "🥗"
          },
          {
            id: 4,
            name: "Grilled Salmon",
            category: "Mains",
            price: 18.99,
            description: "Atlantic salmon with lemon herb seasoning",
            available: false,
            image: "🐟"
          },
          {
            id: 5,
            name: "Chocolate Cake",
            category: "Desserts",
            price: 6.99,
            description: "Rich chocolate layer cake with ganache",
            available: true,
            image: "🍰"
          }
        ];
        
        setMenuItems(demoMenu);
        setError('');
      } catch (err) {
        setError('Failed to load menu items');
        console.error('Menu fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const categorizedMenu = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📋 Menu</h1>
          <p className="mt-2 text-gray-600">Current menu items and availability</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(categorizedMenu).map(([category, items]) => (
            <div key={category} className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-4xl">{item.image}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <span className="text-lg font-bold text-gray-900">
                            ${item.price}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="mt-2">
                          {item.available ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleMenu;