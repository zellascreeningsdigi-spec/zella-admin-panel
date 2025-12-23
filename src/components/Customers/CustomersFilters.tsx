import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Filter, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

export interface CustomerFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  lastUpdatedFrom: string;
  lastUpdatedTo: string;
  lastReportSentFrom: string;
  lastReportSentTo: string;
}

interface CustomersFiltersProps {
  onFilterChange: (filters: CustomerFilters) => void;
  onReset: () => void;
  useReportSentFilter?: boolean; // If true, use lastReportSent filter instead of lastUpdated
}

const CustomersFilters: React.FC<CustomersFiltersProps> = ({ onFilterChange, onReset, useReportSentFilter = false }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<CustomerFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    lastUpdatedFrom: '',
    lastUpdatedTo: '',
    lastReportSentFrom: '',
    lastReportSentTo: '',
  });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFilterChange = (key: keyof CustomerFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    // For search, debounce the API call
    if (key === 'search') {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce the actual fetch
      searchTimeoutRef.current = setTimeout(() => {
        onFilterChange(newFilters);
      }, 500);
    } else {
      // For date filters, update immediately
      onFilterChange(newFilters);
    }
  };

  const handleReset = () => {
    setLocalFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      lastUpdatedFrom: '',
      lastUpdatedTo: '',
      lastReportSentFrom: '',
      lastReportSentTo: '',
    });
    onReset();
  };

  const hasActiveFilters = Object.values(localFilters).some(value => value !== '');

  return (
    <div className="space-y-4">
      {/* Search Bar and Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by company name, email, or document name..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="whitespace-nowrap"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Created Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Created Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={localFilters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    placeholder="From"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">From</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={localFilters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    placeholder="To"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">To</p>
                </div>
              </div>
            </div>

            {/* Last Updated/Report Sent Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {useReportSentFilter ? 'Last Report Sent Range' : 'Last Updated Range'}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={useReportSentFilter ? localFilters.lastReportSentFrom : localFilters.lastUpdatedFrom}
                    onChange={(e) => handleFilterChange(
                      useReportSentFilter ? 'lastReportSentFrom' : 'lastUpdatedFrom',
                      e.target.value
                    )}
                    placeholder="From"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">From</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={useReportSentFilter ? localFilters.lastReportSentTo : localFilters.lastUpdatedTo}
                    onChange={(e) => handleFilterChange(
                      useReportSentFilter ? 'lastReportSentTo' : 'lastUpdatedTo',
                      e.target.value
                    )}
                    placeholder="To"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">To</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-600">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {localFilters.search && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                    Search: {localFilters.search}
                  </span>
                )}
                {localFilters.dateFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    Created from: {new Date(localFilters.dateFrom).toLocaleDateString()}
                  </span>
                )}
                {localFilters.dateTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    Created to: {new Date(localFilters.dateTo).toLocaleDateString()}
                  </span>
                )}
                {!useReportSentFilter && localFilters.lastUpdatedFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Updated from: {new Date(localFilters.lastUpdatedFrom).toLocaleDateString()}
                  </span>
                )}
                {!useReportSentFilter && localFilters.lastUpdatedTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Updated to: {new Date(localFilters.lastUpdatedTo).toLocaleDateString()}
                  </span>
                )}
                {useReportSentFilter && localFilters.lastReportSentFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Report sent from: {new Date(localFilters.lastReportSentFrom).toLocaleDateString()}
                  </span>
                )}
                {useReportSentFilter && localFilters.lastReportSentTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Report sent to: {new Date(localFilters.lastReportSentTo).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomersFilters;
