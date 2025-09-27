import React, { useState } from 'react';
import SimpleDashboard from './SimpleDashboard';
import SimpleKitchen from './SimpleKitchen';
import SimplePublicMenu from './SimplePublicMenu';
import SimpleMenuManagement from './SimpleMenuManagement';
import SimpleReports from './SimpleReports';
import { useAuth } from '../contexts/AuthContext';

type SimpleView = 'dashboard' | 'kitchen' | 'menu' | 'management' | 'reports';

const SimpleNavigation: React.FC = () => {
  const [activeView, setActiveView] = useState<SimpleView>('dashboard');
  const { user, logout } = useAuth();

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <SimpleDashboard />;
      case 'kitchen':
        return <SimpleKitchen />;
      case 'menu':
        return <SimplePublicMenu />;
      case 'management':
        return <SimpleMenuManagement />;
      case 'reports':
        return <SimpleReports />;
      default:
        return <SimpleDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-800">🍽️ RevManager</h1>
              
              {/* Navigation Tabs */}
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📊 Dashboard
                </button>
                
                <button
                  onClick={() => setActiveView('kitchen')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'kitchen'
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  🍳 Kitchen
                </button>
                
                <button
                  onClick={() => setActiveView('menu')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'menu'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📋 Menu
                </button>
                
                <button
                  onClick={() => setActiveView('management')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'management'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ Management
                </button>
                
                <button
                  onClick={() => setActiveView('reports')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'reports'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📈 Reports
                </button>
              </nav>
            </div>
            
            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.first_name} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default SimpleNavigation;