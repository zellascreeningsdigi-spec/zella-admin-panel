import { useState, useEffect } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { AddressVerification, AddressVerificationStats } from '@/types/addressVerification';
import AddressVerificationTable from './AddressVerificationTable';
import AddAddressVerificationDialog from './AddAddressVerificationDialog';
import BulkUploadDialog from './BulkUploadDialog';
import AddressVerificationFilters from './AddressVerificationFilters';

const AddressVerificationTab = () => {
  const [verifications, setVerifications] = useState<AddressVerification[]>([]);
  const [stats, setStats] = useState<AddressVerificationStats>({
    total: 0,
    pending: 0,
    verified: 0,
    failed: 0,
    linkSent: 0,
    expired: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingVerification, setEditingVerification] = useState<AddressVerification | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    verificationStatus: '',
    search: ''
  });

  useEffect(() => {
    fetchVerifications();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAddressVerifications({
        ...filters,
        page: 1,
        limit: 100
      });

      if (response.success && response.data) {
        setVerifications(response.data.verifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
      alert('Failed to load verifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getAddressVerificationStats();
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAdd = () => {
    setEditingVerification(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (verification: AddressVerification) => {
    setEditingVerification(verification);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this verification?')) {
      return;
    }

    try {
      const response = await apiService.deleteAddressVerification(id);
      if (response.success) {
        alert('Verification deleted successfully');
        fetchVerifications();
        fetchStats();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete verification');
    }
  };

  const handleSendLink = async (verification: AddressVerification) => {
    if (!verification._id) return;

    if (!window.confirm(`Send verification link to ${verification.email}?`)) {
      return;
    }

    try {
      const response = await apiService.sendVerificationLink(verification._id);
      if (response.success) {
        alert('Verification link sent successfully!');
        fetchVerifications();
      }
    } catch (error) {
      console.error('Send link error:', error);
      alert('Failed to send verification link');
    }
  };

  const handleDialogSuccess = () => {
    setIsAddDialogOpen(false);
    setEditingVerification(null);
    fetchVerifications();
    fetchStats();
  };

  const handleBulkUploadSuccess = () => {
    setIsBulkUploadOpen(false);
    fetchVerifications();
    fetchStats();
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    alert('Export functionality will be implemented');
  };

  if (loading && verifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading verifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Address Verification</h2>
          <p className="text-gray-500">Manage and track address verification requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Verification
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <AddressVerificationFilters
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Table */}
      <AddressVerificationTable
        verifications={verifications}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSendLink={handleSendLink}
        loading={loading}
      />

      {/* Dialogs */}
      <AddAddressVerificationDialog
        open={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditingVerification(null);
        }}
        onSuccess={handleDialogSuccess}
        editVerification={editingVerification}
      />

      <BulkUploadDialog
        open={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
};

export default AddressVerificationTab;
