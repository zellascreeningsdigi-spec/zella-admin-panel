import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { ArrowLeft, Edit, Mail, Calendar, Send, Download } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import DocumentsSection from './DocumentsSection';
import SendEmailModal from './SendEmailModal';

interface CustomerDetailsViewProps {
  customerId: string;
  onBack: () => void;
  onEdit: (customer: Customer) => void;
}

const CustomerDetailsView: React.FC<CustomerDetailsViewProps> = ({
  customerId,
  onBack,
  onEdit
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCustomerById(customerId);

      if (response.success && response.data) {
        setCustomer(response.data.customer);
      } else {
        setError('Failed to load customer details');
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadAll = async () => {
    if (!customer || !customer.documents || customer.documents.length === 0) {
      alert('No documents available to download');
      return;
    }

    try {
      setDownloadingAll(true);
      // Use the new ZIP download API - downloads all files as a single ZIP
      await apiService.downloadAllDocuments(customerId);
    } catch (error) {
      console.error('Error downloading all files:', error);
      alert(`Failed to download files: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-600">{error || 'Customer not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
            <p className="text-gray-600 text-sm mt-1">Customer Details & Documents</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={downloadingAll || !customer.documents || customer.documents.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingAll ? 'Downloading...' : 'Download All Files'}
          </Button>
          <Button variant="outline" onClick={() => setIsSendEmailModalOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button onClick={() => onEdit(customer)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Customer Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic details about the customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Company Name</p>
              <p className="text-gray-900 mt-1">{customer.companyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Contacts
              </p>
              <div className="space-y-1 mt-2">
                {customer.emails.map((email, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {customer.documentsRequired && customer.documentsRequired.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700">Documents Required</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {customer.documentsRequired.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>System information and timestamps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Customer ID</p>
              <p className="text-gray-900 mt-1 font-mono text-sm">{customer._id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Created At
              </p>
              <p className="text-gray-900 mt-1">{formatDate(customer.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Last Updated
              </p>
              <p className="text-gray-900 mt-1">{formatDate(customer.updatedAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Total Documents</p>
              <p className="text-gray-900 mt-1 text-2xl font-bold text-blue-600">
                {customer.documents?.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <DocumentsSection
        customer={customer}
        onDocumentsUpdated={fetchCustomerDetails}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        customer={customer}
      />
    </div>
  );
};

export default CustomerDetailsView;
