import React from 'react';
import { Eye, Trash2, FileText, CheckCircle, Mail } from 'lucide-react';
import { Report } from '@/types/report';
import { Button } from '@/components/ui/button';

interface ReportsListTableProps {
  reports: Report[];
  onViewReport: (report: Report) => void;
  onDeleteReport?: (reportId: string) => void;
}

const ReportsListTable: React.FC<ReportsListTableProps> = ({
  reports,
  onViewReport,
  onDeleteReport
}) => {
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No report requests</h3>
        <p className="text-sm text-gray-500">Report requests will appear here when created</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-purple-600 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{report.reportType}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {report.description.substring(0, 50)}
                        {report.description.length > 50 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{report.companyName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start">
                    <Mail className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-900">
                      {report.requestedEmails.map((emailObj, idx) => (
                        <div key={idx} className="truncate max-w-xs">
                          {emailObj.email}
                          {idx < report.requestedEmails.length - 1 && ', '}
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 mt-1">
                        {report.requestedEmails.length} recipient(s)
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">{report.documents.length}</div>
                    {report.documents.length > 0 && (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(report.createdAt)}</div>
                  <div className="text-xs text-gray-500">{report.requestedBy.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewReport(report)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {onDeleteReport && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteReport(report._id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsListTable;
