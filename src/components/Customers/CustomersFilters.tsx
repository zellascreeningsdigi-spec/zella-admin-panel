import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Filter, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

export interface CustomerFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  lastUpdatedFrom: string;
  lastUpdatedTo: string;
}

interface CustomersFiltersProps {
  onFilterChange: (filters: CustomerFilters) => void;
  onReset: () => void;
}

const CustomersFilters: React.FC<CustomersFiltersProps> = ({ onFilterChange, onReset }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    lastUpdatedFrom: '',
    lastUpdatedTo: '',
  });
  const isInitialMount = useRef(true);

  const handleFilterChange = (key: keyof CustomerFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // For date filters, update immediately
    if (key !== 'search') {
      onFilterChange(newFilters);
    }
  };

  // Debounce only the search input
  useEffect(() => {
    // Skip initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      onFilterChange(filters);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  const handleReset = () => {
    const resetFilters: CustomerFilters = {
      search: '',
      dateFrom: '',
      dateTo: '',
      lastUpdatedFrom: '',
      lastUpdatedTo: '',
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="space-y-4">
      {/* Search Bar and Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by company name, email, or document name..."
            value={filters.search}
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
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    placeholder="From"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">From</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    placeholder="To"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">To</p>
                </div>
              </div>
            </div>

            {/* Last Updated Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Last Updated Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={filters.lastUpdatedFrom}
                    onChange={(e) => handleFilterChange('lastUpdatedFrom', e.target.value)}
                    placeholder="From"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">From</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={filters.lastUpdatedTo}
                    onChange={(e) => handleFilterChange('lastUpdatedTo', e.target.value)}
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
                {filters.search && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                    Search: {filters.search}
                  </span>
                )}
                {filters.dateFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    Created from: {new Date(filters.dateFrom).toLocaleDateString()}
                  </span>
                )}
                {filters.dateTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    Created to: {new Date(filters.dateTo).toLocaleDateString()}
                  </span>
                )}
                {filters.lastUpdatedFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Updated from: {new Date(filters.lastUpdatedFrom).toLocaleDateString()}
                  </span>
                )}
                {filters.lastUpdatedTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                    Updated to: {new Date(filters.lastUpdatedTo).toLocaleDateString()}
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
