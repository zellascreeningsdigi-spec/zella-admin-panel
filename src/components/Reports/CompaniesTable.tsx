import React from 'react';
import { Customer } from '@/types/customer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Building2, Mail, Calendar, Send, Eye } from 'lucide-react';

interface CompaniesTableProps {
  customers: Customer[];
  onSendReport?: (customer: Customer) => void;
  onShowDetails?: (customer: Customer) => void;
}

const CompaniesTable: React.FC<CompaniesTableProps> = ({ customers, onSendReport, onShowDetails }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No companies found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Company Name</TableHead>
            <TableHead>Email Contacts</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                  {customer.companyName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  <div className="flex flex-col">
                    {customer.emails.slice(0, 2).map((email, idx) => (
                      <span key={idx} className="text-sm text-gray-600">
                        {email}
                      </span>
                    ))}
                    {customer.emails.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{customer.emails.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {formatDate(customer.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {formatDate(customer.updatedAt)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowDetails?.(customer)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Show Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendReport?.(customer)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Report
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CompaniesTable;
