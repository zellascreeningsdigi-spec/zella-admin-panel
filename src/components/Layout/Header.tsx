import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          DigiLocker Integration Dashboard
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          <span className="text-gray-500">Welcome back,</span>
          <span className="font-medium text-gray-900 ml-1">{user?.email}</span>
        </div>
        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;