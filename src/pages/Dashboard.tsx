import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import DashboardOverview from '@/components/Dashboard/DashboardOverview';
import CasesTab from '@/components/Cases/CasesTab';
import CustomersTab from '@/components/Customers/CustomersTab';
import ReportsTab from '@/components/Reports/ReportsTab';
import ManageUsersTab from '@/components/Users/ManageUsersTab';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [casesPageIndex, setCasesPageIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    } else if (user?.role === 'customer') {
      // Customer users should default to the customers tab
      setActiveTab('datahub');
    }

    // Update cases page index from navigation state
    if (location.state?.pageIndex !== undefined) {
      setCasesPageIndex(location.state.pageIndex);
    }
  }, [location.state, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'digilocker':
        return <CasesTab pageIndex={casesPageIndex} />;
      case 'datahub':
        return <CustomersTab />;
      case 'reports':
        return <ReportsTab />;
      case 'manage-users':
        return <ManageUsersTab />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;