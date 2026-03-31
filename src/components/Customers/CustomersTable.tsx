import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Customer } from '@/types/customer';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Trash2
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface CustomersTableProps {
  customers: Customer[];
  onViewCustomer?: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string | undefined) => void;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

const CustomersTable: React.FC<CustomersTableProps> = ({ customers, onViewCustomer, onEditCustomer, onDeleteCustomer, currentPage, pageSize, totalCount, onPageChange }) => {
  const { user } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('companyName')}</div>
        ),
      },
      {
        accessorKey: 'emails',
        header: 'Emails',
        cell: ({ row }) => {
          const emails = row.getValue('emails') as string[];
          return (
            <div className="space-y-1">
              {emails.map((email, index) => (
                <div key={index} className="text-sm">{email}</div>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: ({ row }) => {
          const date = new Date(row.getValue('createdAt'));
          return <div className="text-sm">{date.toLocaleDateString('en-GB')}</div>;
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        cell: ({ row }) => {
          const date = new Date(row.getValue('updatedAt'));
          return <div className="text-sm text-gray-600">{date.toLocaleDateString('en-GB')}</div>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const customer = row.original;
          const isSuperAdmin = user?.role === 'super-admin';
          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                title="View Details"
                onClick={() => onViewCustomer?.(customer)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Edit Customer"
                onClick={() => onEditCustomer?.(customer)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  title="Delete"
                  onClick={() => onDeleteCustomer?.(customer._id)}
                  className="hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onViewCustomer, onEditCustomer, onDeleteCustomer, user]
  );

  const _pageSize = pageSize ?? 10;
  const _currentPage = currentPage ?? 1;
  const pageCount = totalCount != null ? Math.ceil(totalCount / _pageSize) : -1;

  const table = useReactTable({
    data: customers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: {
        pageIndex: _currentPage - 1,
        pageSize: _pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function' && onPageChange) {
        const newState = updater({ pageIndex: _currentPage - 1, pageSize: _pageSize });
        onPageChange(newState.pageIndex + 1);
      }
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end space-x-2">
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
          Showing {(totalCount ?? customers.length) === 0 ? 0 : (_currentPage - 1) * _pageSize + 1} to{' '}
          {Math.min(_currentPage * _pageSize, totalCount ?? customers.length)}{' '}
          of {totalCount ?? customers.length} customers
        </div>
      </div>
    </div>
  );
};

export default CustomersTable;
