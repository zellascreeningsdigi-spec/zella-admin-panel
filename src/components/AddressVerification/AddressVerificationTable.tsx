import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Edit, Trash2, Send, Eye, MessageCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddressVerification } from '@/types/addressVerification';
import apiService from '@/services/api';

interface AddressVerificationTableProps {
  verifications: AddressVerification[];
  onEdit: (verification: AddressVerification) => void;
  onDelete: (id: string) => void;
  onSendLink: (verification: AddressVerification) => void;
  loading: boolean;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  // When true, only the "View Details" action is shown (used by the vendor
  // read-only portal). Edit / delete / send-link / report actions are hidden.
  readOnly?: boolean;
  // Row-selection for bulk actions (Vendor tab). Controlled via a Set of ids.
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[], checked: boolean) => void;
  // Vendor tab: show a per-row "Export Vendor Report" action for submitted cases.
  showVendorExport?: boolean;
  // Whether to show the per-case ₹ price in the Handled By column (super-admin only).
  showPrice?: boolean;
}

const AddressVerificationTable = ({
  verifications,
  onEdit,
  onDelete,
  onSendLink,
  loading,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  readOnly = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  showVendorExport = false,
  showPrice = true,
}: AddressVerificationTableProps) => {
  const navigate = useNavigate();

  const handleDownloadVendorReport = useCallback(async (verification: AddressVerification) => {
    if (!verification._id) return;
    try {
      await apiService.downloadVendorReport(verification._id, verification.code);
    } catch (error) {
      console.error('Download vendor report error:', error);
    }
  }, []);

  const handleSendWhatsApp = useCallback((verification: AddressVerification) => {
    // Get the verification link from the verification object
    const verificationLink = verification.verificationLink || '';

    // Format phone number - remove any non-digit characters and ensure it has country code
    let phoneNumber = verification.phone.replace(/\D/g, '');

    // If phone doesn't start with country code, assume India (+91)
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    // Create the WhatsApp message
    const message = `Dear ${verification.name},

Greetings from Zella Screenings!

We are conducting a background verification on behalf of *${verification.companyName}*. As part of this process, we need you to verify your address details.

*Address to Verify:*
${verification.address}

Please click the link below to complete your address verification:
${verificationLink}

*Instructions:*
1. Click the verification link
2. Confirm if the address is correct
3. Upload required proof documents
4. Submit the verification form

⏰ *Important:* This verification link will expire in 24 hours.

If you have any questions, please contact us:
📧 Email: start@zellascreenings.com
📞 Phone: +91 8178685006 / +91 9871967859

Best regards,
*Team Zella Screenings*
SECURE | AUTHENTICATE`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp Web URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  }, []);

  const handleViewReport = useCallback((verification: AddressVerification) => {
    if (!verification._id) return;
    navigate(`/address-verifications/${verification._id}/report`);
  }, [navigate]);

  const handleDownloadReport = useCallback(async (verification: AddressVerification) => {
    if (!verification._id) return;
    try {
      await apiService.downloadAddressVerificationReport(verification._id, verification.code);
    } catch (error) {
      console.error('Download report error:', error);
      alert('Failed to download report. Please try again.');
    }
  }, []);

  const pageIds = verifications.map((v) => v._id).filter(Boolean) as string[];
  const allSelectedOnPage = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds?.has(id));

  const columns = useMemo<ColumnDef<AddressVerification>[]>(
    () => [
      ...(selectable
        ? [{
            id: 'select',
            header: () => (
              <input
                type="checkbox"
                aria-label="Select all on page"
                checked={allSelectedOnPage}
                onChange={(e) => onToggleSelectAll?.(pageIds, e.target.checked)}
              />
            ),
            cell: ({ row }: { row: any }) => (
              <input
                type="checkbox"
                aria-label="Select row"
                checked={!!(row.original._id && selectedIds?.has(row.original._id))}
                onChange={() => row.original._id && onToggleSelect?.(row.original._id)}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          } as ColumnDef<AddressVerification>]
        : []),
      {
        accessorKey: 'formSubmitDate',
        header: 'Date',
        cell: ({ row }) => {
          const date = row.original.formSubmitDate || row.original.createdAt;
          return date ? new Date(date).toLocaleDateString('en-IN') : '-';
        },
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue('code')}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Candidate',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue('name')}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
          </div>
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
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => (
          <div className="max-w-xs truncate" title={row.getValue('address')}>
            {row.getValue('address')}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            verified: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            insufficiency: 'bg-orange-100 text-orange-800',
          };
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'verificationStatus',
        header: 'Verification',
        cell: ({ row }) => {
          const status = row.getValue('verificationStatus') as string;
          const colors = {
            not_initiated: 'bg-gray-100 text-gray-800',
            link_sent: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800',
          };
          const labels = {
            not_initiated: 'Not Started',
            link_sent: 'Link Sent',
            in_progress: 'In Progress',
            completed: 'Completed',
            expired: 'Expired',
          };
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {labels[status as keyof typeof labels] || status}
            </span>
          );
        },
      },
      {
        id: 'handledBy',
        header: 'Handled By',
        cell: ({ row }) => {
          const vendor = row.original.vendor;
          const vendorName = vendor && typeof vendor === 'object' ? vendor.name : null;
          const member = row.original.vendorWork?.assignedMember;
          const memberName = member && typeof member === 'object' ? member.name : null;
          const vwStatus = row.original.vendorWork?.status;
          const vwPrice = row.original.vendorWork?.price;
          if (!vendorName) return <span className="text-gray-400 text-sm">—</span>;
          return (
            <div className="text-sm">
              <div className="font-medium">{vendorName}</div>
              {memberName && <div className="text-gray-500">{memberName}</div>}
              {showPrice && vwPrice != null && <div className="text-gray-500">₹{vwPrice}</div>}
              {vwStatus && vwStatus !== 'not_started' && (
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    vwStatus === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : vwStatus === 'disputed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {vwStatus === 'in_progress' ? 'In Progress' : vwStatus}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => row.original._id && navigate(`/address-verifications/${row.original._id}`)}
              title="View Details"
              className="text-brand-green hover:text-brand-green-600 hover:bg-brand-green-50"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(row.original)}
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSendLink(row.original)}
                  title="Send Verification Link"
                  disabled={row.original.verificationStatus === 'completed'}
                >
                  <Send className="w-4 h-4" />
                </Button>
                {row.original.verificationLink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendWhatsApp(row.original)}
                    title="Send via WhatsApp"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                )}
                {/* Digital candidate report — Digital tab only, never on the Vendor tab. */}
                {!showVendorExport
                  && row.original.status === 'verified' && row.original.verificationStatus === 'completed' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReport(row.original)}
                      title="View Report (HTML)"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReport(row.original)}
                      title="Download Report (PDF)"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {/* Vendor "Address Check" report — Vendor tab only, never on the Digital tab. */}
                {showVendorExport
                  && (row.original.vendorWork?.status === 'verified' || row.original.vendorWork?.status === 'disputed') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadVendorReport(row.original)}
                    title="Export Vendor Report (PDF)"
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => row.original._id && onDelete(row.original._id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEdit, onDelete, onSendLink, navigate, handleSendWhatsApp, handleViewReport, handleDownloadReport, handleDownloadVendorReport, readOnly, selectable, selectedIds, allSelectedOnPage, showVendorExport, showPrice]
  );

  const _pageSize = pageSize ?? 10;
  const _currentPage = currentPage ?? 1;
  const pageCount = totalCount != null ? Math.ceil(totalCount / _pageSize) : -1;

  const table = useReactTable({
    data: verifications,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
    state: {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-lg font-medium text-gray-500">No verifications found</div>
        <div className="text-sm text-gray-400 mt-2">Click "Add Verification" to create one</div>
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
              <TableRow key={row.id}>
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {(totalCount ?? verifications.length) === 0 ? 0 : (_currentPage - 1) * _pageSize + 1} to{' '}
          {Math.min(
            _currentPage * _pageSize,
            totalCount ?? verifications.length
          )}{' '}
          of {totalCount ?? verifications.length} results
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
    </div>
  );
};

export default AddressVerificationTable;
