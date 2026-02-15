import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
}

const AddressVerificationTable = ({
  verifications,
  onEdit,
  onDelete,
  onSendLink,
  loading,
}: AddressVerificationTableProps) => {
  const navigate = useNavigate();

  const handleSendWhatsApp = (verification: AddressVerification) => {
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
  };

  const handleViewReport = async (verification: AddressVerification) => {
    if (!verification._id) return;
    try {
      await apiService.viewAddressVerificationReport(verification._id);
    } catch (error) {
      console.error('View report error:', error);
      // Error already shown by apiService
    }
  };

  const handleDownloadReport = async (verification: AddressVerification) => {
    if (!verification._id) return;
    try {
      await apiService.downloadAddressVerificationReport(verification._id, verification.code);
    } catch (error) {
      console.error('Download report error:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const columns = useMemo<ColumnDef<AddressVerification>[]>(
    () => [
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
            {row.original.status === 'verified' && row.original.verificationStatus === 'completed' && (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => row.original._id && onDelete(row.original._id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete, onSendLink, navigate, handleSendWhatsApp, handleViewReport, handleDownloadReport]
  );

  const table = useReactTable({
    data: verifications,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
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
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            verifications.length
          )}{' '}
          of {verifications.length} results
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
