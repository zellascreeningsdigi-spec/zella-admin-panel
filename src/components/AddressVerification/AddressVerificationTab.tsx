import { useState, useEffect } from 'react';
import { Plus, Upload, Download, UserPlus, X, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { AddressVerification, AddressVerificationStats } from '@/types/addressVerification';
import AddressVerificationTable from './AddressVerificationTable';
import AddAddressVerificationDialog from './AddAddressVerificationDialog';
import BulkUploadDialog from './BulkUploadDialog';
import BulkAssignVendorDialog from './BulkAssignVendorDialog';
import AddressVerificationFilters, { AVFilters } from './AddressVerificationFilters';

type AVMode = 'digital' | 'vendor';

interface AddressVerificationTabProps {
  mode?: AVMode;
}

const AddressVerificationTab = ({ mode = 'digital' }: AddressVerificationTabProps) => {
  const isVendorMode = mode === 'vendor';
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super-admin';
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
  const [filters, setFilters] = useState<AVFilters>({
    status: '',
    verificationStatus: '',
    search: '',
    vendor: '',
    vendorWorkStatus: '',
    companyName: '',
    city: '',
    state: '',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchVerifications();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, mode]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAddressVerifications({
        ...filters,
        // Split the collection by whether a vendor is attached.
        hasVendor: isVendorMode ? 'true' : 'false',
        page: currentPage,
        limit: PAGE_SIZE
      });

      if (response.success && response.data) {
        setVerifications(response.data.verifications || []);
        setTotalCount(response.data.pagination?.total ?? 0);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
      return next;
    });
  };

  const handleBulkAssignSuccess = () => {
    setIsBulkAssignOpen(false);
    setSelectedIds(new Set());
    fetchVerifications();
    fetchStats();
  };

  const [exportingBulk, setExportingBulk] = useState(false);
  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;
    setExportingBulk(true);
    try {
      await apiService.downloadBulkVendorReports(Array.from(selectedIds));
    } finally {
      setExportingBulk(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {isVendorMode ? 'Vendor Address Verification' : 'Digital Address Verification'}
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            {isVendorMode
              ? 'Cases assigned to vendors for field verification'
              : 'Cases verified digitally (no vendor)'}
          </p>
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
        onFilterChange={(newFilters) => { setCurrentPage(1); setFilters(newFilters); }}
        hideVendorFilter={!isVendorMode}
      />

      {/* Bulk action bar (Vendor tab only) */}
      {isVendorMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-blue-900">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsBulkAssignOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Assign to Vendor
            </Button>
            <Button size="sm" variant="outline" disabled={exportingBulk} onClick={handleBulkExport}>
              <FileArchive className="w-4 h-4 mr-2" /> {exportingBulk ? 'Exporting…' : 'Export Reports'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <AddressVerificationTable
        verifications={verifications}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSendLink={handleSendLink}
        loading={loading}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        selectable={isVendorMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        showVendorExport={isVendorMode}
        showPrice={isSuperAdmin}
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
        mode={mode}
        canSetPrice={isSuperAdmin}
      />

      <BulkUploadDialog
        open={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />

      {isVendorMode && (
        <BulkAssignVendorDialog
          open={isBulkAssignOpen}
          onClose={() => setIsBulkAssignOpen(false)}
          onSuccess={handleBulkAssignSuccess}
          caseIds={Array.from(selectedIds)}
          canSetPrice={isSuperAdmin}
        />
      )}
    </div>
  );
};

export default AddressVerificationTab;
