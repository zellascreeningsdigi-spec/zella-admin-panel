import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Mail, Calendar, FileText, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CompanyDetailsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [emailReports, setEmailReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      fetchCompanyDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customer details
      const customerResponse = await apiService.getCustomerById(customerId!);
      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data.customer);
      }

      // Fetch email reports
      const reportsResponse = await apiService.getCustomerEmailReports(customerId!);
      if (reportsResponse.success && reportsResponse.data) {
        setEmailReports(reportsResponse.data.emailReports);
      }
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading company details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Company not found'}</p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building2 className="h-8 w-8 mr-3 text-blue-600" />
                {customer.companyName}
              </h1>
              <p className="text-gray-600 mt-1">Company Details & Email History</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchCompanyDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <p className="text-gray-900">{customer.companyName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email Contacts</label>
                <div className="space-y-1">
                  {customer.emails.map((email, idx) => (
                    <p key={idx} className="text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      {email}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created Date</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {formatDate(customer.createdAt)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Report Sent</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {formatDate(customer.lastReportSent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Reports History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Email Reports History
            </CardTitle>
            <CardDescription>
              All reports sent to {customer.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No email reports sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emailReports.map((report, index) => (
                  <div
                    key={report._id || index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{report.subject}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(report.sentAt)}
                          </span>
                          <span>
                            Sent by: {report.sentBy?.name}
                            {report.sentBy?.designation && ` (${report.sentBy.designation})`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            report.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : report.status === 'partially_sent'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {report.status === 'sent'
                            ? 'Sent'
                            : report.status === 'partially_sent'
                            ? 'Partially Sent'
                            : 'Failed'}
                        </span>
                      </div>
                    </div>

                    {/* Recipients */}
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Recipients ({report.recipients?.length || 0})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {report.results?.details?.map((result: any, idx: number) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                              result.success
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {result.email}
                            {result.success ? ' ✓' : ' ✗'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                        {report.message}
                      </p>
                    </div>

                    {/* Excel Data Info */}
                    {report.excelData && (
                      <div className="border-t pt-3">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          Excel Data
                        </label>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">File:</span>{' '}
                            <span className="font-medium">{report.excelData.fileName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rows:</span>{' '}
                            <span className="font-medium">{report.excelData.rowCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>{' '}
                            <span className="font-medium">
                              {(report.excelData.fileSize / 1024).toFixed(2)} KB
                            </span>
                          </div>
                        </div>

                        {/* Sample Data Table */}
                        {report.excelData.sampleData && report.excelData.sampleData.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-2">
                              Sample data (first {report.excelData.sampleData.length} rows):
                            </p>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs border">
                                <thead className="bg-gray-100">
                                  <tr>
                                    {Object.keys(report.excelData.sampleData[0] || {}).map(
                                      (key, idx) => (
                                        <th
                                          key={idx}
                                          className="px-3 py-2 border text-left font-medium"
                                        >
                                          {key}
                                        </th>
                                      )
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.excelData.sampleData.map((row: any, rowIdx: number) => (
                                    <tr key={rowIdx} className="hover:bg-gray-50">
                                      {Object.values(row).map((value: any, cellIdx: number) => (
                                        <td key={cellIdx} className="px-3 py-2 border">
                                          {value !== null && value !== undefined ? String(value) : 'N/A'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Results Summary */}
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-green-600">
                        ✓ Success: {report.results?.successCount || 0}
                      </span>
                      <span className="text-red-600">
                        ✗ Failed: {report.results?.failureCount || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
