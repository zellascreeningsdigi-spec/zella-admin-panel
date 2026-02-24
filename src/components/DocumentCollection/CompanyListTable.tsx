import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompanySummary } from '@/types/documentCollection';

interface CompanyListTableProps {
  companies: CompanySummary[];
  loading: boolean;
  onSelectCompany: (company: CompanySummary) => void;
  onAddCandidate: (company: CompanySummary) => void;
  onSendAllLinks: (company: CompanySummary) => void;
}

const CompanyListTable = ({
  companies,
  loading,
  onSelectCompany,
  onAddCandidate,
  onSendAllLinks,
}: CompanyListTableProps) => {
  const columns = useMemo<ColumnDef<CompanySummary>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900 cursor-pointer hover:text-brand-green">
            {row.getValue('companyName')}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('total')}</span>
        ),
      },
      {
        accessorKey: 'pending',
        header: 'Pending',
        cell: ({ row }) => (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {row.getValue('pending')}
          </span>
        ),
      },
      {
        accessorKey: 'approved',
        header: 'Approved',
        cell: ({ row }) => (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {row.getValue('approved')}
          </span>
        ),
      },
      {
        accessorKey: 'completed',
        header: 'Completed',
        cell: ({ row }) => (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {row.getValue('completed')}
          </span>
        ),
      },
      {
        accessorKey: 'notInitiated',
        header: 'Not Sent',
        cell: ({ row }) => (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {row.getValue('notInitiated')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddCandidate(row.original);
              }}
              title="Add Candidate"
            >
              <Plus className="w-4 h-4" />
            </Button>
            {row.original.notInitiated > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendAllLinks(row.original);
                }}
                title="Send All Links"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onAddCandidate, onSendAllLinks]
  );

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-lg font-medium text-gray-500">No companies found</div>
        <div className="text-sm text-gray-400 mt-2">Add a document collection to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onSelectCompany(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              companies.length
            )}{' '}
            of {companies.length} companies
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyListTable;
