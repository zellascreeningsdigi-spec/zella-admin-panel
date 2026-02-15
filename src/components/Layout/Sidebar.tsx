import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Home, Users, BarChart3, UserCog, MapPin } from 'lucide-react';
import logo from "../../logo192.png";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { logout, user } = useAuth();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['super-admin', 'admin', 'operator', 'viewer'] },
    { id: 'digilocker', label: 'Digilocker', icon: FileText, roles: ['super-admin', 'admin', 'operator', 'viewer'] },
    { id: 'datahub', label: 'Datahub', icon: Users, roles: ['super-admin', 'admin', 'operator', 'viewer', 'customer'] },
    { id: 'address-verification', label: 'Address Verification', icon: MapPin, roles: ['super-admin', 'admin'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['super-admin', 'admin', 'customer'] },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  // Show Manage Users only for ashish@zellascreenings.com
  const canManageUsers = user?.email === 'ashish@zellascreenings.com';

  return (
    <div className="h-screen w-[300px] min-w-[300px] flex-shrink-0 bg-gray-900 text-white flex flex-col">
      <div className="flex items-center p-5 space-x-3">
        <div className="flex-shrink-0">
          <img src={logo} width={50} height={50} alt="Zella Screenings Logo"></img>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">{user?.role === 'customer' ? 'Zella Screenings - DataHub' : 'Admin Panel'}</h1>
        </div>
      </div>


      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              </li>
            );
          })}

          {/* Manage Users - Only for ashish@zellascreenings.com */}
          {canManageUsers && (
            <li>
              <button
                onClick={() => onTabChange('manage-users')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'manage-users'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <UserCog className="h-5 w-5 mr-3" />
                Manage Users
              </button>
            </li>
          )}
        </ul>
      </nav>
      
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full text-black border-gray-600"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;