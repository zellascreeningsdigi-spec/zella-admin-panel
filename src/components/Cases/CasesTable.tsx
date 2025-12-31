import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiService } from '@/services/api';
import { Case } from '@/types/case';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Shield,
  Trash2
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CasesTableProps {
  cases: Case[];
  onCaseUpdated?: () => void;
  onEditCase?: (caseData: Case) => void;
  onDeleteCase?: (caseData: string | undefined) => void;
  initialPageIndex?: number;
}

const CasesTable: React.FC<CasesTableProps> = ({ cases, onCaseUpdated, onEditCase, onDeleteCase, initialPageIndex }) => {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex || 0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [digiLockerStatusFilter, setDigiLockerStatusFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Restore page index when navigating back from documents or when initialPageIndex changes
  useEffect(() => {
    if (initialPageIndex !== undefined) {
      setCurrentPageIndex(initialPageIndex);
    }
  }, [initialPageIndex]);

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      insufficiency: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles]
          }`}
      >
        {status === 'pending' ? 'Pending' :
          status === 'completed' ? 'Resolved Case' :
            'Insufficiency'}
      </span>
    );
  };

  const handleDigilockerAction = useCallback(async (caseData: Case) => {
    setIsProcessing(caseData.id);

    try {
      const response = await apiService.sendDigiLockerAuthEmail(caseData);

      if (response.success) {
        alert(`DigiLocker authorization email sent successfully for ${caseData.name}!\n\nSession ID: ${response.data?.sessionId}\nEmail sent to: ${caseData.email}\n\nThe user will receive the authorization URL via email and can complete the verification process.`);

        // Refresh the cases list to show updated DigiLocker status
        if (onCaseUpdated) {
          onCaseUpdated();
        }
      } else {
        throw new Error(response.message || 'Failed to send DigiLocker authorization email');
      }
    } catch (error) {
      console.error('DigiLocker email sending failed:', error);
      alert(`Failed to send DigiLocker authorization email for ${caseData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(null);
    }
  }, [onCaseUpdated]);

  const handleDeleteClick = (caseId: string) => {
    setCaseToDelete(caseId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (caseToDelete && onDeleteCase) {
      onDeleteCase(caseToDelete);
    }
    setDeleteDialogOpen(false);
    setCaseToDelete(null);
  };

  const getDigiLockerStatusBadge = (status?: string) => {
    if (!status || status === 'not_initiated') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not Started
        </span>
      );
    }

    const statusStyles = {
      initiated: 'bg-blue-100 text-blue-800',
      auth_success: 'bg-yellow-100 text-yellow-800',
      documents_fetched: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      initiated: 'Initiated',
      auth_success: 'Authenticated',
      documents_fetched: 'Documents Fetched',
      completed: 'Completed',
      failed: 'Failed',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'
          }`}
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  // Apply filters to cases
  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      // Status filter
      if (statusFilter && caseItem.status !== statusFilter) {
        return false;
      }

      // DigiLocker Status filter
      if (digiLockerStatusFilter) {
        const caseDigiLockerStatus = caseItem.digiLockerStatus || 'not_initiated';
        if (caseDigiLockerStatus !== digiLockerStatusFilter) {
          return false;
        }
      }

      // Company filter
      if (companyFilter && !caseItem.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const caseDate = new Date(caseItem.date);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        // Set time to start/end of day for accurate comparison
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
        }
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
        }

        if (fromDate && toDate) {
          if (!(caseDate >= fromDate && caseDate <= toDate)) {
            return false;
          }
        } else if (fromDate) {
          if (!(caseDate >= fromDate)) {
            return false;
          }
        } else if (toDate) {
          if (!(caseDate <= toDate)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [cases, statusFilter, digiLockerStatusFilter, companyFilter, dateFrom, dateTo]);

  // Clear all filters
  const handleClearFilters = () => {
    setStatusFilter('');
    setDigiLockerStatusFilter('');
    setCompanyFilter('');
    setDateFrom('');
    setDateTo('');
    setGlobalFilter('');
  };

  // Check if any filters are active
  const hasActiveFilters = statusFilter || digiLockerStatusFilter || companyFilter || dateFrom || dateTo || globalFilter;

  const columns = useMemo<ColumnDef<Case>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => {
          const date = new Date(row.getValue('date'));
          return <div>{date.toLocaleDateString('en-GB')}</div>;
        },
      },
      {
        accessorKey: 'code',
        header: 'BGVID',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('code')}</div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Candidate Name',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'initiatorName',
        header: 'Initiator Name',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('initiatorName') || '-'}</div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'companyName',
        header: 'Company',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
      },
      {
        accessorKey: 'digiLockerStatus',
        header: 'DigiLocker',
        cell: ({ row }) => getDigiLockerStatusBadge(row.getValue('digiLockerStatus')),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const caseData = row.original;
          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                title="Edit Case"
                onClick={() => onEditCase?.(caseData)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="View Report"
                onClick={() => navigate(`/documents?caseId=${caseData.id}`, {
                  state: { pageIndex: currentPageIndex }
                })}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Send DigiLocker Authorization Email"
                onClick={() => handleDigilockerAction(caseData)}
                disabled={isProcessing === caseData.id}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 disabled:opacity-50"
              >
                {isProcessing === caseData.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                ) : (
                  <Shield className="h-4 w-4 text-blue-600" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Delete"
                onClick={() => caseData._id && handleDeleteClick(caseData._id)}
                className="hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isProcessing, handleDigilockerAction, onEditCase, onDeleteCase, navigate, currentPageIndex]
  );

  const table = useReactTable({
    data: filteredCases,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: {
        pageIndex: currentPageIndex,
        pageSize: 10,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPagination = updater({ pageIndex: currentPageIndex, pageSize: 10 });
        setCurrentPageIndex(newPagination.pageIndex);
      }
    },
    manualPagination: false,
  });

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-8"
            >
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Resolved Case</option>
                <option value="insufficiency">Insufficiency</option>
              </select>
            </div>

            {/* DigiLocker Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">DigiLocker Status</label>
              <select
                value={digiLockerStatusFilter}
                onChange={(e) => setDigiLockerStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All DigiLocker Statuses</option>
                <option value="not_initiated">Not Started</option>
                <option value="initiated">Initiated</option>
                <option value="auth_success">Authenticated</option>
                <option value="documents_fetched">Documents Fetched</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Company Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Company</label>
              <Input
                placeholder="Filter by company..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-600">Active:</span>
            {statusFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                Status: {statusFilter === 'pending' ? 'Pending' : statusFilter === 'completed' ? 'Resolved Case' : 'Insufficiency'}
              </span>
            )}
            {digiLockerStatusFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                DigiLocker: {digiLockerStatusFilter === 'not_initiated' ? 'Not Started' :
                             digiLockerStatusFilter === 'initiated' ? 'Initiated' :
                             digiLockerStatusFilter === 'auth_success' ? 'Authenticated' :
                             digiLockerStatusFilter === 'documents_fetched' ? 'Documents Fetched' :
                             digiLockerStatusFilter === 'completed' ? 'Completed' : 'Failed'}
              </span>
            )}
            {companyFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                Company: "{companyFilter}"
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                From: {new Date(dateFrom).toLocaleDateString('en-GB')}
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                To: {new Date(dateTo).toLocaleDateString('en-GB')}
              </span>
            )}
            {globalFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-800">
                Search: "{globalFilter}"
              </span>
            )}
            <span className="text-xs text-gray-500">
              ({filteredCases.length} of {cases.length} cases)
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Input
          placeholder="Search cases..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()} ({table.getFilteredRowModel().rows.length} total cases)
        </div>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Case"
        description="Are you sure you want to delete this case? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive
      />
    </div>
  );
};

export default CasesTable;