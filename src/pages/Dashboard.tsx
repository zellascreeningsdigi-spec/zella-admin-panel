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
import CompanyDetailsTab from '@/components/Reports/CompanyDetailsTab';
import AddressVerificationTab from '@/components/AddressVerification/AddressVerificationTab';
import DocumentCollectionTab from '@/components/DocumentCollection/DocumentCollectionTab';
import DocumentScannerTab from '@/components/DocumentScanner/DocumentScannerTab';
import AuditLogTab from '@/components/AuditLog/AuditLogTab';
import VendorsTab from '@/components/Vendors/VendorsTab';
import VendorCasesTab from '@/components/Vendors/VendorCasesTab';
import VendorTeamTab from '@/components/Vendors/VendorTeamTab';
import VendorAnalyticsTab from '@/components/Vendors/VendorAnalyticsTab';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [casesPageIndex, setCasesPageIndex] = useState<number | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    } else if (user?.role === 'customer') {
      // Customer users should default to the customers tab
      setActiveTab('datahub');
    } else if (user?.role === 'vendor' || user?.role === 'vendor-member') {
      // Vendor users land on their "My Cases" view
      setActiveTab('my-cases');
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
    // Check if we're viewing company details
    if (activeTab === 'company-details') {
      return <CompanyDetailsTab onBack={() => setActiveTab('reports')} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'digilocker':
        return <CasesTab pageIndex={casesPageIndex} />;
      case 'datahub':
        return <CustomersTab />;
      case 'digital-address-verification':
        return <AddressVerificationTab mode="digital" />;
      case 'vendor-address-verification':
        return <AddressVerificationTab mode="vendor" />;
      case 'document-collection':
        return (
          <DocumentCollectionTab
            initialSelectedCompanyId={location.state?.selectedCompanyId}
            initialSelectedCompanyName={location.state?.selectedCompanyName}
          />
        );
      case 'document-scanner':
        return <DocumentScannerTab />;
      case 'reports':
        return <ReportsTab />;
      case 'audit-logs':
        return user?.role === 'super-admin' ? <AuditLogTab /> : <DashboardOverview />;
      case 'vendors':
        return user?.role === 'super-admin' ? <VendorsTab /> : <DashboardOverview />;
      case 'vendor-analytics':
        return user?.role === 'super-admin'
          ? <VendorAnalyticsTab />
          : <DashboardOverview />;
      case 'my-cases':
        return (user?.role === 'vendor' || user?.role === 'vendor-member')
          ? <VendorCasesTab />
          : <DashboardOverview />;
      case 'team':
        return user?.role === 'vendor' ? <VendorTeamTab /> : <DashboardOverview />;
      case 'manage-users':
        return <ManageUsersTab />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;