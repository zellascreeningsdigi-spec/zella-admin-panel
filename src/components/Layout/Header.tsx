import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Key, LogOut } from 'lucide-react';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowMenu(false);
    logout();
    window.location.href = '/login';
  };

  const handleResetPassword = () => {
    setShowMenu(false);
    setShowResetPassword(true);
  };

  return (
    <>
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{user?.role}</p>
                </div>

                <button
                  onClick={handleResetPassword}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Key className="h-4 w-4" />
                  <span>Reset Password</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t border-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ResetPasswordDialog
        isOpen={showResetPassword}
        onClose={() => setShowResetPassword(false)}
      />
    </>
  );
};

export default Header;