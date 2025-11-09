import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Plus, RefreshCw, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AddCustomerDialog from './AddCustomerDialog';
import BulkUploadCustomersDialog from './BulkUploadCustomersDialog';
import CustomerDetailsView from './CustomerDetailsView';
import CustomersFilters, { CustomerFilters } from './CustomersFilters';
import CustomersTable from './CustomersTable';
import DocumentsSection from './DocumentsSection';

const CustomersTab: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

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
        lastUpdatedFrom: filterParams?.lastUpdatedFrom || undefined,
        lastUpdatedTo: filterParams?.lastUpdatedTo || undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
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

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsAddCustomerOpen(true);
  };

  const handleAddCustomerClose = () => {
    setIsAddCustomerOpen(false);
    setEditingCustomer(null);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddCustomerOpen(true);
  };

  const handleDeleteCustomer = async (customerId: string | undefined) => {
    if (!customerId) return;

    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await apiService.deleteCustomer(customerId);
        if (response.success) {
          fetchCustomers();
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer. Please try again.');
      }
    }
  };

  const handleCustomerAdded = () => {
    fetchCustomers();
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleBackToList = () => {
    setViewingCustomer(null);
    fetchCustomers(); // Refresh data when going back
  };

  const handleEditFromDetails = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddCustomerOpen(true);
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleFilterChange = (newFilters: CustomerFilters) => {
    fetchCustomers(newFilters);
  };

  const handleResetFilters = () => {
    fetchCustomers();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading customers...</span>
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

  // If user is a customer, show only their documents
  if (user?.role === 'customer' && customers.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Company Documents</h1>
          <p className="text-gray-600 mt-1">
            {customers[0].companyName}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Company Name</p>
              <p className="text-gray-900">{customers[0].companyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email Contacts</p>
              <div className="space-y-1">
                {customers[0].emails.map((email, idx) => (
                  <p key={idx} className="text-gray-900">{email}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <DocumentsSection
          customer={customers[0]}
          onDocumentsUpdated={fetchCustomers}
        />
      </div>
    );
  }

  // If viewing a specific customer, show details view
  if (viewingCustomer) {
    return (
      <>
        <CustomerDetailsView
          customerId={viewingCustomer._id!}
          onBack={handleBackToList}
          onEdit={handleEditFromDetails}
        />

        {/* Add/Edit Customer Dialog */}
        <AddCustomerDialog
          isOpen={isAddCustomerOpen}
          onClose={handleAddCustomerClose}
          onCustomerAdded={handleCustomerAdded}
          editCustomer={editingCustomer}
          onCustomerUpdated={handleCustomerAdded}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">
            Manage customer companies and their email contacts ({customers.length} total)
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleAddCustomer}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
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
            <CardTitle className="text-sm font-medium">Avg. Emails per Customer</CardTitle>
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
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Manage customer companies and their email contacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomersFilters
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
          <CustomersTable
            customers={customers}
            onViewCustomer={handleViewCustomer}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Customer Dialog */}
      <AddCustomerDialog
        isOpen={isAddCustomerOpen}
        onClose={handleAddCustomerClose}
        onCustomerAdded={handleCustomerAdded}
        editCustomer={editingCustomer}
        onCustomerUpdated={handleCustomerAdded}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadCustomersDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadComplete={handleCustomerAdded}
      />
    </div>
  );
};

export default CustomersTab;
