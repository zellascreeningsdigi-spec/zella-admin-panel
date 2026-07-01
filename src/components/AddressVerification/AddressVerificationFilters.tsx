import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { apiService } from '@/services/api';

export interface AVFilters {
  status: string;
  verificationStatus: string;
  search: string;
  vendor: string;
  vendorWorkStatus: string;
  companyName: string;
  city: string;
  state: string;
  dateFrom: string;
  dateTo: string;
}

interface AddressVerificationFiltersProps {
  filters: AVFilters;
  onFilterChange: (filters: AVFilters) => void;
}

const AddressVerificationFilters = ({ filters, onFilterChange }: AddressVerificationFiltersProps) => {
  const [vendors, setVendors] = useState<{ _id: string; name: string }[]>([]);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getVendors({ isActive: true, limit: 200 });
        if (res.success && res.data) setVendors(res.data.vendors || []);
      } catch (e) {
        console.error('Failed to load vendors for filter:', e);
      }
    })();
  }, []);

  const handleChange = (field: keyof AVFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFilterChange({
      status: '', verificationStatus: '', search: '',
      vendor: '', vendorWorkStatus: '', companyName: '', city: '', state: '', dateFrom: '', dateTo: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowMore((s) => !s)}>
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            {showMore ? 'Fewer filters' : 'More filters'}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Name, phone, email..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
            <option value="insufficiency">Insufficiency</option>
          </select>
        </div>

        <div>
          <Label htmlFor="verificationStatus">Verification Status</Label>
          <select
            id="verificationStatus"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.verificationStatus}
            onChange={(e) => handleChange('verificationStatus', e.target.value)}
          >
            <option value="">All Verification Statuses</option>
            <option value="not_initiated">Not Started</option>
            <option value="link_sent">Link Sent</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div>
          <Label htmlFor="vendor">Vendor</Label>
          <select
            id="vendor"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.vendor}
            onChange={(e) => handleChange('vendor', e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showMore && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t">
          <div>
            <Label htmlFor="vendorWorkStatus">Vendor Work Status</Label>
            <select
              id="vendorWorkStatus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.vendorWorkStatus}
              onChange={(e) => handleChange('vendorWorkStatus', e.target.value)}
            >
              <option value="">All Vendor Work</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="verified">Verified</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
          <div>
            <Label htmlFor="companyName">Company</Label>
            <Input id="companyName" value={filters.companyName} onChange={(e) => handleChange('companyName', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={filters.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="City" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" value={filters.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="State" />
          </div>
          <div>
            <Label htmlFor="dateFrom">Created From</Label>
            <Input id="dateFrom" type="date" value={filters.dateFrom} onChange={(e) => handleChange('dateFrom', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dateTo">Created To</Label>
            <Input id="dateTo" type="date" value={filters.dateTo} onChange={(e) => handleChange('dateTo', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressVerificationFilters;
