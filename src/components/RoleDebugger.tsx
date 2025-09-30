import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const RoleDebugger: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Debug:</strong> No user authenticated
      </div>
    );
  }

  return (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
      <h3 className="font-bold">🔍 Role Debug Info</h3>
      <div className="text-sm mt-2">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>First Name:</strong> {user.first_name || 'N/A'}</p>
        <p><strong>User ID:</strong> {user.id}</p>
      </div>
    </div>
  );
};

export default RoleDebugger;