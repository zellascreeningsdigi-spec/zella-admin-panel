import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Clock, Mail, User, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface EmailHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

interface EmailReport {
  _id: string;
  sentBy: {
    name: string;
    designation?: string;
    email: string;
  };
  recipients: string[];
  subject: string;
  message: string;
  excelData: {
    rowCount: number;
    fileName: string;
    fileSize: number;
    sampleData: any[];
  };
  status: 'sent' | 'partially_sent' | 'failed';
  results: {
    successCount: number;
    failureCount: number;
    details: Array<{
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
  };
  sentAt: string;
}

const EmailHistoryDialog: React.FC<EmailHistoryDialogProps> = ({ isOpen, onClose, customer }) => {
  const [emailReports, setEmailReports] = useState<EmailReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer?._id) {
      fetchEmailReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  const fetchEmailReports = async () => {
    if (!customer?._id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getCustomerEmailReports(customer._id);
      if (response.success && response.data) {
        setEmailReports(response.data.emailReports);
      } else {
        setError(response.message || 'Failed to load email reports');
      }
    } catch (err) {
      console.error('Error fetching email reports:', err);
      setError('Failed to load email reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </span>
        );
      case 'partially_sent':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Partially Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  const handleDeleteReport = async (reportId: string, subject: string) => {
    if (!customer?._id) return;

    if (!window.confirm(`Are you sure you want to delete the email report: "${subject}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiService.deleteCustomerEmailReport(customer._id, reportId);
      if (response.success) {
        // Refresh the list
        fetchEmailReports();
      } else {
        alert(response.message || 'Failed to delete email report');
      }
    } catch (err) {
      console.error('Error deleting email report:', err);
      alert('Failed to delete email report. Please try again.');
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Report History - {customer.companyName}
          </DialogTitle>
          <DialogDescription>
            View all email reports sent to this company
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading email history...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchEmailReports}>Try Again</Button>
          </div>
        ) : emailReports.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No email reports sent yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emailReports.map((report) => (
              <div
                key={report._id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Report Header */}
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{report.subject}</h3>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(report.sentAt)}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {report.sentBy.name}
                          {report.sentBy.designation && ` (${report.sentBy.designation})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReport(report._id, report.subject)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(report._id)}
                      >
                        {expandedReportId === report._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Report Details */}
                {expandedReportId === report._id && (
                  <div className="p-4 space-y-4">
                    {/* Recipients - Segregated by Status */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-3">
                        Email Recipients ({report.recipients.length} total)
                      </label>

                      {/* Successfully Sent Emails */}
                      {report.results.successCount > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm font-medium text-green-700">
                              Successfully Sent ({report.results.successCount})
                            </span>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex flex-wrap gap-2">
                              {report.results.details
                                .filter(d => d.success)
                                .map((result, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-300"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {result.email}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Failed Emails */}
                      {report.results.failureCount > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <XCircle className="h-4 w-4 text-red-600 mr-1" />
                            <span className="text-sm font-medium text-red-700">
                              Failed to Send ({report.results.failureCount})
                            </span>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="space-y-2">
                              {report.results.details
                                .filter(d => !d.success)
                                .map((result, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-red-100 border border-red-300 rounded p-2"
                                  >
                                    <div className="flex items-start">
                                      <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="font-medium text-red-900 text-xs">
                                          {result.email}
                                        </div>
                                        {result.error && (
                                          <div className="text-xs text-red-700 mt-1">
                                            Error: {result.error}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Message Content
                      </label>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm whitespace-pre-wrap">
                        {report.message}
                      </div>
                    </div>

                    {/* Excel Data Info */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        Excel Report Details
                      </label>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">File Name:</span>
                            <p className="font-medium">{report.excelData.fileName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Rows:</span>
                            <p className="font-medium">{report.excelData.rowCount}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <p className="font-medium">
                              {(report.excelData.fileSize / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>

                        {/* Sample Data Preview */}
                        {report.excelData.sampleData && report.excelData.sampleData.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">Sample Data (First {report.excelData.sampleData.length} rows):</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-100">
                                    {Object.keys(report.excelData.sampleData[0] || {}).map((key, idx) => (
                                      <th key={idx} className="border border-gray-300 px-2 py-1 text-left font-semibold">
                                        {key}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.excelData.sampleData.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="hover:bg-gray-50">
                                      {Object.values(row).map((value: any, cellIdx) => (
                                        <td key={cellIdx} className="border border-gray-300 px-2 py-1">
                                          {String(value)}
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
                    </div>

                    {/* Send Results */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Send Results
                      </label>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center text-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="font-medium">{report.results.successCount} Successful</span>
                        </div>
                        {report.results.failureCount > 0 && (
                          <div className="flex items-center text-red-700">
                            <XCircle className="h-4 w-4 mr-1" />
                            <span className="font-medium">{report.results.failureCount} Failed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailHistoryDialog;
