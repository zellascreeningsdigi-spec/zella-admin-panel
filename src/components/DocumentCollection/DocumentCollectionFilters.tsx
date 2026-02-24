import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface DocumentCollectionFiltersProps {
  filters: {
    status: string;
    verificationStatus: string;
    search: string;
  };
  onFilterChange: (filters: any) => void;
}

const DocumentCollectionFilters = ({
  filters,
  onFilterChange,
}: DocumentCollectionFiltersProps) => {
  const handleChange = (field: string, value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onFilterChange({
      status: '',
      verificationStatus: '',
      search: '',
    });
  };

  const hasActiveFilters = filters.status || filters.verificationStatus || filters.search;

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="dc-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="dc-search"
              placeholder="Name, phone, email..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dc-status">Status</Label>
          <select
            id="dc-status"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <Label htmlFor="dc-verificationStatus">Verification Status</Label>
          <select
            id="dc-verificationStatus"
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
      </div>
    </div>
  );
};

export default DocumentCollectionFilters;
