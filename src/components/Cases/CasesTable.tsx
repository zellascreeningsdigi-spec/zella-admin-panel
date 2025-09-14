import { Button } from '@/components/ui/button';
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
  FileEdit,
  MessageCircle,
  Shield,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CasesTableProps {
  cases: Case[];
  onCaseUpdated?: () => void;
}

const CasesTable: React.FC<CasesTableProps> = ({ cases, onCaseUpdated }) => {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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
        alert(`DigiLocker authorization email sent successfully for ${caseData.name}!\n\nSession ID: ${response.data?.sessionId}\nEmail sent to: hsdhameliya88@gmail.com\n\nThe user will receive the authorization URL via email and can complete the verification process.`);

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

  const columns = useMemo<ColumnDef<Case>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('code')}</div>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => {
          const date = new Date(row.getValue('date'));
          return <div>{date.toLocaleDateString('en-GB')}</div>;
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'appNo',
        header: 'App No.',
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue('appNo')}</div>
        ),
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
                onClick={() => console.log('Edit case:', caseData.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="WhatsApp"
                onClick={() => window.open(`https://wa.me/91${caseData.phone}`, '_blank')}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="View Report"
                onClick={() => navigate(`/documents?caseId=${caseData.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Edit Report"
                onClick={() => console.log('Edit report:', caseData.id)}
              >
                <FileEdit className="h-4 w-4" />
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
                onClick={() => console.log('Delete case:', caseData.id)}
                className="hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          );
        },
      },
    ],
    [isProcessing, handleDigilockerAction]
  );

  const table = useReactTable({
    data: cases,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default CasesTable;