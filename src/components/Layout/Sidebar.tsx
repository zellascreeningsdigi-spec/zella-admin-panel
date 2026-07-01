import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Home, Users, BarChart3, UserCog, MapPin, FileCheck, ShieldCheck, ScanLine, Store, ClipboardList, UsersRound } from 'lucide-react';
import logo from "../../logo192.png";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  open?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, open = false, onClose }) => {
  const { logout, user } = useAuth();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['super-admin', 'admin', 'operator', 'viewer'] },
    { id: 'digilocker', label: 'Digilocker', icon: FileText, roles: ['super-admin', 'admin', 'operator', 'viewer'] },
    { id: 'datahub', label: 'Datahub', icon: Users, roles: ['super-admin', 'admin', 'operator', 'viewer', 'customer'] },
    { id: 'address-verification', label: 'Address Verification', icon: MapPin, roles: ['super-admin', 'admin'] },
    { id: 'document-collection', label: 'Documents Collection', icon: FileCheck, roles: ['super-admin', 'admin'] },
    { id: 'document-scanner', label: 'Document Scanner', icon: ScanLine, roles: ['super-admin', 'admin'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['super-admin', 'admin', 'customer'] },
    { id: 'vendors', label: 'Vendors', icon: Store, roles: ['super-admin'] },
    { id: 'vendor-analytics', label: 'Vendor Analytics', icon: BarChart3, roles: ['super-admin', 'admin'] },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, roles: ['super-admin'] },
    { id: 'my-cases', label: 'My Cases', icon: ClipboardList, roles: ['vendor', 'vendor-member'] },
    { id: 'team', label: 'Team', icon: UsersRound, roles: ['vendor'] },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  // Show Manage Users only for ashish@zellascreenings.com
  const canManageUsers = user?.email === 'ashish@zellascreenings.com';

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:w-[300px] md:min-w-[300px] md:flex-shrink-0
          h-screen bg-gray-900 text-white flex flex-col
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
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
                  onClick={() => handleNavClick(item.id)}
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
                onClick={() => handleNavClick('manage-users')}
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
    </>
  );
};

export default Sidebar;