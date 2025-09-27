import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import BasicDashboard from './BasicDashboard';

const UnifiedDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logout Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => logout()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg"
        >
          Logout
        </button>
      </div>

      {/* Main Dashboard */}
      <BasicDashboard 
        userRole={user.role} 
        userName={user.first_name || user.email} 
      />
    </div>
  );
};

export default UnifiedDashboard;