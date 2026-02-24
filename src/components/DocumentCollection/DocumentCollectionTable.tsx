import { useMemo, useCallback } from 'react';
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
import { Edit, Trash2, Send, Eye, MessageCircle, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentCollection } from '@/types/documentCollection';
import apiService from '@/services/api';

interface DocumentCollectionTableProps {
  collections: DocumentCollection[];
  onEdit: (collection: DocumentCollection) => void;
  onDelete: (id: string) => void;
  onSendLink: (collection: DocumentCollection) => void;
  loading: boolean;
  selectedCompanyId?: string;
  selectedCompanyName?: string;
}

const DocumentCollectionTable = ({
  collections,
  onEdit,
  onDelete,
  onSendLink,
  loading,
  selectedCompanyId,
  selectedCompanyName,
}: DocumentCollectionTableProps) => {
  const navigate = useNavigate();

  const handleSendWhatsApp = useCallback((collection: DocumentCollection) => {
    const verificationLink = collection.verificationLink || '';
    let phoneNumber = collection.phone.replace(/\D/g, '');
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    const message = `Dear ${collection.name},

Greetings from Zella Screenings!

We are conducting a background verification on behalf of *${collection.companyName}*. As part of this process, we need you to complete the BGV Form and upload required documents.

Please click the link below to complete the form:
${verificationLink}

*You will need to provide:*
1. Personal Information & Address History
2. Education Details
3. Employment History
4. Professional References
5. Gap Period Details
6. Letter of Authorization
7. Supporting Documents

⏰ *Important:* This link will expire in 30 days.

If you have any questions, please contact us:
📧 Email: start@zellascreenings.com
📞 Phone: +91 8178685006 / +91 9871967859

Best regards,
*Team Zella Screenings*
SECURE | AUTHENTICATE`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }, []);

  const handleDownloadDocx = useCallback(async (collection: DocumentCollection) => {
    if (!collection._id) return;
    try {
      const response = await apiService.downloadDocumentCollectionDocx(collection._id);
      if (response.success && response.data) {
        window.open(response.data.downloadUrl, '_blank');
      } else {
        alert('No generated DOCX found. Please generate it first from the detail page.');
      }
    } catch (error) {
      console.error('Download DOCX error:', error);
      alert('Failed to download DOCX');
    }
  }, []);

  const columns = useMemo<ColumnDef<DocumentCollection>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => {
          const date = row.original.createdAt;
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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
          };
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                colors[status] || 'bg-gray-100 text-gray-800'
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
          const colors: Record<string, string> = {
            not_initiated: 'bg-gray-100 text-gray-800',
            link_sent: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800',
          };
          const labels: Record<string, string> = {
            not_initiated: 'Not Started',
            link_sent: 'Link Sent',
            in_progress: 'In Progress',
            completed: 'Completed',
            expired: 'Expired',
          };
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                colors[status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {labels[status] || status}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => row.original._id && navigate(`/document-collections/${row.original._id}`, {
                state: {
                  selectedCompanyId: selectedCompanyId || row.original.customerId,
                  selectedCompanyName: selectedCompanyName || row.original.companyName,
                }
              })}
              title="View Details"
              className="text-brand-green hover:text-brand-green-600 hover:bg-brand-green-50"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => row.original._id && navigate(`/document-collections/${row.original._id}/documents`, {
                state: {
                  selectedCompanyId: selectedCompanyId || row.original.customerId,
                  selectedCompanyName: selectedCompanyName || row.original.companyName,
                }
              })}
              title="View Documents"
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
            >
              <FileText className="w-4 h-4" />
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
              title="Send Link"
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
            {row.original.generatedDocx?.s3Key && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadDocx(row.original)}
                title="Download DOCX"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
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
          </div>
        ),
      },
    ],
    [onEdit, onDelete, onSendLink, navigate, handleSendWhatsApp, handleDownloadDocx, selectedCompanyId, selectedCompanyName]
  );

  const table = useReactTable({
    data: collections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-lg font-medium text-gray-500">No document collections found</div>
        <div className="text-sm text-gray-400 mt-2">Click "Add Collection" to create one</div>
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            collections.length
          )}{' '}
          of {collections.length} results
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

export default DocumentCollectionTable;
