import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Home, Users, BarChart3 } from 'lucide-react';
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
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['super-admin', 'admin'] },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <div className="h-screen w-[300px] bg-gray-900 text-white flex flex-col">
      <div className='flex items-center justify-center p-5'>
        <div>
          <img src={logo} width={50} height={50} alt="Zella Screenings Logo"></img>
        </div>
      <div className="p-6">
        <h1 className="text-xl font-bold">{user?.role === 'customer' ? 'Zella Screenings - DataHub' : 'Admin Panel'}</h1>
        {/* <p className="text-gray-400 text-sm mt-1">Zella Screenings</p> */}
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