import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerMenu } from '../customer/CustomerMenu';
import { ServerDashboard } from '../server/ServerDashboard';
import { ChefDashboard } from '../chef/ChefDashboard';
import { ManagerDashboard } from '../manager/ManagerDashboard';
import { OwnerDashboard } from '../owner/OwnerDashboard';

export const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'customer':
      return <CustomerMenu />;
    case 'server':
      return <ServerDashboard />;
    case 'chef':
      return <ChefDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'owner':
      return <OwnerDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unknown Role</h2>
            <p className="text-gray-600">Your account role is not recognized.</p>
          </div>
        </div>
      );
  }
};