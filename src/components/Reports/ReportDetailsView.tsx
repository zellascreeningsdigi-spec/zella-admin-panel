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
  const canUpload = isSuperAdmin; // Only super-admin can upload
  const canDelete = !isSubmitted && isSuperAdmin; // Only super-admin can delete
  const canSubmit = false; // Customers cannot submit anymore

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
    <div className="space-y-6 pb-6">
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

      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Subject:</label>
            <p className="mt-1 text-sm text-gray-900 font-medium">{report.reportType}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Message:</label>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{report.description}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Sent On:</label>
            <p className="mt-1 text-sm text-gray-600">{formatDate(report.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload - Super Admin Only */}
      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Reports</CardTitle>
            <CardDescription>
              Upload additional reports .Drag and drop files or click to browse.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

      {/* Uploaded Reports - Combined Section */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Reports</CardTitle>
          <CardDescription>All report files available for download</CardDescription>
        </CardHeader>
        <CardContent>
          {!report.originalAttachment &&
           (!report.additionalAttachments || report.additionalAttachments.length === 0) &&
           report.documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No reports available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Original XLSX Attachment */}
              {report.originalAttachment && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.originalAttachment.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(report.originalAttachment.fileSize)}
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
              )}

              {/* Additional Attachments */}
              {report.additionalAttachments && report.additionalAttachments.map((attachment, index) => (
                <div key={`additional-${index}`} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                  </div>
                  {attachment.s3Url && (
                    <a
                      href={attachment.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  )}
                </div>
              ))}

              {/* Uploaded Documents */}
              {report.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.s3Url && (
                      <a
                        href={doc.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
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
