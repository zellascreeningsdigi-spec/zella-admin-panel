import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { RefreshCw, Building2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompaniesTable from './CompaniesTable';
import CustomersFilters, { CustomerFilters } from '../Customers/CustomersFilters';
import SendReportDialog from './SendReportDialog';

const ReportsTab: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSendReportOpen, setIsSendReportOpen] = useState(false);

  const fetchCustomers = async (filterParams?: CustomerFilters) => {
    try {
      // Only show full page loading on initial load
      if (initialLoad) {
        setLoading(true);
      }
      setError(null);

      const response = await apiService.getCustomers({
        limit: 100,
        search: filterParams?.search || undefined,
        dateFrom: filterParams?.dateFrom || undefined,
        dateTo: filterParams?.dateTo || undefined,
        lastReportSentFrom: filterParams?.lastReportSentFrom || undefined,
        lastReportSentTo: filterParams?.lastReportSentTo || undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleFilterChange = (newFilters: CustomerFilters) => {
    fetchCustomers(newFilters);
  };

  const handleResetFilters = () => {
    fetchCustomers();
  };

  const handleSendReport = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSendReportOpen(true);
  };

  const handleCloseSendReport = () => {
    setIsSendReportOpen(false);
    setSelectedCustomer(null);
  };

  const handleShowDetails = (customer: Customer) => {
    // Navigate to dashboard with company-details tab, passing customerId in state
    navigate('/dashboard', {
      state: {
        activeTab: 'company-details',
        customerId: customer._id
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading companies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            View and analyze company reports ({customers.length} total companies)
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Email Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {customers.reduce((sum, customer) => sum + customer.emails.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Emails per Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customers.length > 0
                ? (customers.reduce((sum, customer) => sum + customer.emails.length, 0) / customers.length).toFixed(1)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-gray-700" />
            <CardTitle>All Companies</CardTitle>
          </div>
          <CardDescription>
            View all companies and their information. Click on a company to view detailed reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomersFilters
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            useReportSentFilter={true}
          />
          <CompaniesTable
            customers={customers}
            onSendReport={handleSendReport}
            onShowDetails={handleShowDetails}
          />
        </CardContent>
      </Card>

      {/* Send Report Dialog */}
      <SendReportDialog
        isOpen={isSendReportOpen}
        onClose={handleCloseSendReport}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default ReportsTab;
