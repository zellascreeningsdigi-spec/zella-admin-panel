import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import VendorsTable, { Vendor } from './VendorsTable';
import AddVendorDialog from './AddVendorDialog';

const PAGE_SIZE = 20;

const VendorsTab = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getVendors({
        page: currentPage,
        limit: PAGE_SIZE,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setVendors(response.data.vendors || []);
        setTotalCount(response.data.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      alert('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleAdd = () => {
    setEditingVendor(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (vendor: Vendor) => {
    if (!window.confirm(`Deactivate vendor "${vendor.name}"? Their login will be disabled.`)) {
      return;
    }
    try {
      const response = await apiService.deleteVendor(vendor._id);
      if (response.success) {
        alert('Vendor deactivated successfully');
        fetchVendors();
      } else {
        alert(response.message || 'Failed to deactivate vendor');
      }
    } catch (error: any) {
      console.error('Deactivate vendor error:', error);
      alert(error.message || 'Failed to deactivate vendor');
    }
  };

  const handleDialogSuccess = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
    fetchVendors();
  };

  const pageCount = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Vendors</h2>
          <p className="text-sm sm:text-base text-gray-500">
            Manage verification vendors. New vendors get a login with a default password and are
            asked to reset it on first sign-in.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or GSTIN"
          value={search}
          onChange={(e) => {
            setCurrentPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <VendorsTable
        vendors={vendors}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} vendors
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AddVendorDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingVendor(null);
        }}
        onSuccess={handleDialogSuccess}
        editVendor={editingVendor}
      />
    </div>
  );
};

export default VendorsTab;
