import React, { useState } from 'react';
import SimpleDashboard from './SimpleDashboard';
import SimpleKitchen from './SimpleKitchen';
import SimpleMenuManagement from './SimpleMenuManagement';
import SimpleReports from './SimpleReports';
import SimplePublicMenu from './SimplePublicMenu';
import StaffPayroll from './StaffPayroll';
import SimpleOrderTaking from './SimpleOrderTaking';
import RoleDebugger from './RoleDebugger';

interface BasicDashboardProps {
  userRole: string;
  userName: string;
}

const BasicDashboard: React.FC<BasicDashboardProps> = ({ userRole, userName }) => {
  // Set default tab based on role
  const getDefaultTab = () => {
    switch (userRole) {
      case 'server':
        return 'orders';
      case 'chef':
        return 'kitchen';
      case 'customer':
        return 'public-menu';
      default:
        return 'dashboard';
    }
  };
  
  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());

  // Debug: Log the user role
  console.log('BasicDashboard - User Role:', userRole, 'User Name:', userName);

  // Define tabs based on role
  const getAvailableTabs = () => {
    const roleTabs = {
      'owner': [
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
        { id: 'kitchen', label: '� Kitchen Management', icon: '�' },
        { id: 'menu-management', label: '📋 Menu Management', icon: '📋' },
        { id: 'staff', label: '👥 Staff & Payroll', icon: '👥' },
        { id: 'reports', label: '📈 Reports & Analytics', icon: '📈' },
        { id: 'public-menu', label: '🍽️ Public Menu', icon: '🍽️' }
      ],
      'manager': [
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
        { id: 'kitchen', label: '🍳 Kitchen Management', icon: '🍳' },
        { id: 'menu-management', label: '📋 Menu Management', icon: '📋' },
        { id: 'staff', label: '👥 Staff & Payroll', icon: '👥' },
        { id: 'reports', label: '📈 Reports & Analytics', icon: '📈' },
        { id: 'public-menu', label: '🍽️ Public Menu', icon: '🍽️' }
      ],
      'admin': [  // Add admin role in case that's what's in the DB
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
        { id: 'kitchen', label: '🍳 Kitchen Management', icon: '🍳' },
        { id: 'menu-management', label: '📋 Menu Management', icon: '📋' },
        { id: 'staff', label: '👥 Staff & Payroll', icon: '👥' },
        { id: 'reports', label: '📈 Reports & Analytics', icon: '📈' },
        { id: 'public-menu', label: '🍽️ Public Menu', icon: '🍽️' }
      ],
      'chef': [
        { id: 'kitchen', label: '🍳 Kitchen Management', icon: '🍳' },
        { id: 'menu-management', label: '📋 Menu Management', icon: '📋' },
        { id: 'public-menu', label: '🍽️ Public Menu', icon: '🍽️' }
      ],
      'server': [
        { id: 'orders', label: '📝 Take Orders', icon: '📝' },
        { id: 'kitchen', label: '🍳 Kitchen Queue', icon: '🍳' },
        { id: 'public-menu', label: '🍽️ Menu', icon: '🍽️' }
      ],
      'customer': [
        { id: 'public-menu', label: '🍽️ Menu', icon: '🍽️' }
      ]
    };

    const availableTabs = roleTabs[userRole as keyof typeof roleTabs] || [
      { id: 'public-menu', label: '🍽️ Public Menu', icon: '🍽️' }
    ];
    console.log('Available tabs for role', userRole, ':', availableTabs);
    return availableTabs;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SimpleDashboard onNavigateToTab={setActiveTab} />;
      case 'kitchen':
        return <SimpleKitchen />;
      case 'menu-management':
        return <SimpleMenuManagement />;
      case 'staff':
        return <StaffPayroll />;
      case 'reports':
        return <SimpleReports />;
      case 'public-menu':
        return <SimplePublicMenu />;
      case 'orders':
        return <SimpleOrderTaking />;
      default:
        // Default based on role
        if (userRole === 'server') {
          return <SimpleOrderTaking />;
        } else if (userRole === 'chef') {
          return <SimpleKitchen />;
        } else if (userRole === 'customer') {
          return <SimplePublicMenu />;
        }
        return <SimpleDashboard onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Debug Info */}
      <div className="p-4">
        <RoleDebugger />
      </div>
      
      {/* Tab Navigation Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">🍽️ RevManager</h1>
                <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)} - {userName}
                </span>
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  Active: {activeTab}
                </span>
              </div>
              <nav className="flex space-x-4">
                {getAvailableTabs().map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      console.log('Tab clicked:', tab.id);
                      setActiveTab(tab.id);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors border ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-0">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BasicDashboard;