import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { BellOff, BellRing, Plus, RefreshCw, Upload, X } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  const fetchCustomers = async (filterParams?: CustomerFilters, page?: number) => {
    try {
      // Only show full page loading on initial load
      if (initialLoad) {
        setLoading(true);
      }
      setError(null);

      const response = await apiService.getCustomers({
        page: page ?? currentPage,
        limit: PAGE_SIZE,
        search: filterParams?.search || undefined,
        dateFrom: filterParams?.dateFrom || undefined,
        dateTo: filterParams?.dateTo || undefined,
        lastUpdatedFrom: filterParams?.lastUpdatedFrom || undefined,
        lastUpdatedTo: filterParams?.lastUpdatedTo || undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data.customers);
        setTotalCount(response.data.pagination?.total ?? 0);
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
  }, [currentPage]);

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Bulk-selection state (super-admin only — used for the bulk
  // password-expiry-reminder on/off action)
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; enable: boolean }>({ open: false, enable: false });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const isSuperAdmin = user?.role === 'super-admin';

  const handleDeleteCustomer = (customerId: string | undefined) => {
    if (!customerId) return;
    setCustomerToDelete(customerId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      const response = await apiService.deleteCustomer(customerToDelete);
      if (response.success) {
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    } finally {
      setCustomerToDelete(null);
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
    setCurrentPage(1);
    fetchCustomers(newFilters, 1);
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    fetchCustomers(undefined, 1);
  };

  const handleToggleReminders = async (customer: Customer) => {
    if (!customer._id) return;
    const enabled = !customer.sendPasswordExpiryReminders;
    // Optimistic update so the bell flips immediately.
    setCustomers(prev =>
      prev.map(c => (c._id === customer._id ? { ...c, sendPasswordExpiryReminders: enabled } : c))
    );
    try {
      const res = await apiService.setCustomerPasswordReminders(customer._id, enabled);
      if (!res.success) {
        throw new Error(res.message || 'Update failed');
      }
    } catch (err) {
      console.error('Toggle reminders error:', err);
      alert(`Failed to update reminders: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Revert on failure.
      fetchCustomers();
    }
  };

  const openBulkConfirm = (enable: boolean) => {
    if (selectedCustomers.length === 0) return;
    setBulkConfirm({ open: true, enable });
  };

  const confirmBulkToggle = async () => {
    const ids = selectedCustomers
      .map(c => c._id)
      .filter((id): id is string => !!id);
    if (ids.length === 0) {
      setBulkConfirm({ open: false, enable: false });
      return;
    }
    setBulkSubmitting(true);
    try {
      const res = await apiService.bulkSetCustomerPasswordReminders(ids, bulkConfirm.enable);
      if (res.success) {
        const modified = res.data?.modified ?? ids.length;
        alert(`Password expiry reminders ${bulkConfirm.enable ? 'enabled' : 'disabled'} for ${modified} company${modified === 1 ? '' : 'ies'}.`);
        setSelectedCustomers([]);
        fetchCustomers();
      } else {
        throw new Error(res.message || 'Bulk update failed');
      }
    } catch (err) {
      console.error('Bulk toggle error:', err);
      alert(`Bulk update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBulkSubmitting(false);
      setBulkConfirm({ open: false, enable: false });
    }
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
            Manage customer companies and their email contacts ({totalCount} total)
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
            <div className="text-2xl font-bold">{totalCount}</div>
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

          {/* Bulk action toolbar — visible only when super-admin has selected ≥1 row */}
          {isSuperAdmin && selectedCustomers.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <span className="font-medium">{selectedCustomers.length}</span>
                <span>company{selectedCustomers.length === 1 ? '' : 'ies'} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkConfirm(true)}
                  disabled={bulkSubmitting}
                >
                  <BellRing className="h-4 w-4 mr-2" />
                  Turn reminders ON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkConfirm(false)}
                  disabled={bulkSubmitting}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Turn reminders OFF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomers([])}
                  disabled={bulkSubmitting}
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <CustomersTable
            customers={customers}
            onViewCustomer={handleViewCustomer}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
            enableSelection={isSuperAdmin}
            onSelectionChange={setSelectedCustomers}
            onToggleReminders={handleToggleReminders}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteCustomer}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This will also delete all associated data and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive={true}
      />

      {/* Bulk password-reminder Confirmation Dialog */}
      <ConfirmationDialog
        open={bulkConfirm.open}
        onOpenChange={(open) => setBulkConfirm(prev => ({ ...prev, open }))}
        onConfirm={confirmBulkToggle}
        title={bulkConfirm.enable ? 'Enable password reminders' : 'Disable password reminders'}
        description={
          bulkConfirm.enable
            ? `Users of the ${selectedCustomers.length} selected company${selectedCustomers.length === 1 ? '' : 'ies'} will start receiving password expiry reminder emails (7 days and 1 day before expiry).`
            : `Users of the ${selectedCustomers.length} selected company${selectedCustomers.length === 1 ? '' : 'ies'} will stop receiving password expiry reminder emails.`
        }
        confirmText={bulkConfirm.enable ? 'Turn ON' : 'Turn OFF'}
        cancelText="Cancel"
        destructive={!bulkConfirm.enable}
      />
    </div>
  );
};

export default CustomersTab;
