import React from 'react';

const SimpleApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">RevManager</h1>
        <p className="text-gray-600 mb-4">Restaurant Management System</p>
        <div className="space-y-4">
          <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Customer Menu
          </button>
          <button className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
            Server Dashboard
          </button>
          <button className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
            Kitchen Queue
          </button>
          <button className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600">
            Management
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleApp;