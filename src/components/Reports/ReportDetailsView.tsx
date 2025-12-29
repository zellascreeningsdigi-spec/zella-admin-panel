import React, { useState, useCallback } from 'react';
import { ArrowLeft, Upload, Trash2, Download, Send, CheckCircle, XCircle, AlertCircle, FileText, Calendar, User } from 'lucide-react';
import { Report, REPORT_STATUS_COLORS, PRIORITY_COLORS } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';

interface ReportDetailsViewProps {
  report: Report;
  onBack: () => void;
  onUpdate: () => void;
}

const ReportDetailsView: React.FC<ReportDetailsViewProps> = ({ report: initialReport, onBack, onUpdate }) => {
  const { user } = useAuth();
  const [report, setReport] = useState<Report>(initialReport);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isSuperAdmin = user?.role === 'super-admin';
  const isSubmitted = report.status === 'submitted' || report.status === 'reviewed';
  const canUpload = isCustomer || isSuperAdmin;
  const canDelete = !isSubmitted && (isSuperAdmin || (isCustomer && report.status !== 'submitted'));
  const canSubmit = isCustomer && !isSubmitted && report.documents.length > 0;

  const refreshReport = async () => {
    try {
      const response = await apiService.getReportById(report._id);
      if (response) {
        setReport(response);
      }
    } catch (error) {
      console.error('Error refreshing report:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canUpload || uploading) return;

    for (const file of acceptedFiles) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentName', file.name);

        await apiService.uploadReportDocument(report._id, formData);
        await refreshReport();
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
      }
    }
  }, [report._id, canUpload, uploading, refreshReport]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !canUpload || uploading,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip']
    }
  });

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiService.deleteReportDocument(report._id, documentId);
      await refreshReport();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  const handleSubmitReport = async () => {
    if (!window.confirm('Are you sure you want to submit this report? You will not be able to delete files after submission.')) {
      return;
    }

    try {
      setSubmitting(true);
      await apiService.submitReport(report._id);
      await refreshReport();
      alert('Report submitted successfully! The admin has been notified.');
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const sentEmails = report.requestedEmails.filter(e => e.status === 'sent');
  const failedEmails = report.requestedEmails.filter(e => e.status === 'failed');

  return (
    <div className="space-y-6 pb-6 max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.reportType}</h1>
            <p className="text-sm text-gray-500 mt-1">{report.companyName}</p>
          </div>
        </div>
        {canSubmit && (
          <Button
            onClick={handleSubmitReport}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        )}
      </div>

      {/* Status and Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${REPORT_STATUS_COLORS[report.status]}`}>
              {report.status}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[report.priority]}`}>
              {report.priority}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDate(report.dueDate)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Description:</label>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{report.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Requested By:</label>
              <p className="mt-1 text-sm text-gray-600">
                {report.requestedBy.name} ({report.requestedBy.email})
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Requested On:</label>
              <p className="mt-1 text-sm text-gray-600">{formatDate(report.createdAt)}</p>
            </div>
            {report.submittedAt && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted By:</label>
                  <p className="mt-1 text-sm text-gray-600">
                    {report.submittedBy?.name} ({report.submittedBy?.email})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted On:</label>
                  <p className="mt-1 text-sm text-gray-600">{formatDate(report.submittedAt)}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Original Attachment */}
      {report.originalAttachment && (
        <Card>
          <CardHeader>
            <CardTitle>Original Request Attachment (XLSX)</CardTitle>
            <CardDescription>XLSX file sent with the report request email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.originalAttachment.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(report.originalAttachment.fileSize)} • {report.originalAttachment.rowCount} rows
                  </p>
                </div>
              </div>
              {report.originalAttachment.s3Url && (
                <a
                  href={report.originalAttachment.s3Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Attachment */}
      {report.additionalAttachment && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Attachment</CardTitle>
            <CardDescription>Additional file sent with the report request email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.additionalAttachment.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(report.additionalAttachment.fileSize)}
                  </p>
                </div>
              </div>
              {report.additionalAttachment.s3Url && (
                <a
                  href={report.additionalAttachment.s3Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Status */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Email delivery status for this report request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Successfully Sent Emails */}
            {sentEmails.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">Successfully Sent ({sentEmails.length})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {sentEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 pl-7 bg-white border border-gray-200 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{email.email}</p>
                        <p className="text-xs text-gray-500">{formatDate(email.sentAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Emails */}
            {failedEmails.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-900">Failed to Send ({failedEmails.length})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {failedEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 pl-7 bg-white border border-red-200 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{email.email}</p>
                        <p className="text-xs text-red-600">{email.error || 'Unknown error'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              {isSubmitted
                ? 'Report submitted - You can still upload additional documents but cannot delete existing ones'
                : 'Drag and drop files or click to browse. Max 100MB per file.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                  <p className="text-xs text-yellow-800">
                    This report has been submitted. You can upload additional files but cannot delete existing ones.
                  </p>
                </div>
              </div>
            )}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {uploading ? (
                <p className="text-sm text-gray-600">Uploading...</p>
              ) : isDragActive ? (
                <p className="text-sm text-purple-600 font-medium">Drop files here</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or click to select
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, ZIP (Max 100MB)
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({report.documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {report.documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {report.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)} • Uploaded by {doc.uploadedBy.name} on{' '}
                        {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.s3Url && (
                      <a
                        href={doc.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportDetailsView;
