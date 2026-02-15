import React, { useState, useCallback } from 'react';
import { ArrowLeft, Upload, Trash2, Download, Send, FileText } from 'lucide-react';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useDropzone } from 'react-dropzone';
import XLSXViewer from './XLSXViewer';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super-admin';
  const isSubmitted = report.status === 'submitted' || report.status === 'reviewed';
  const canUpload = isSuperAdmin; // Only super-admin can upload
  const canDelete = !isSubmitted && isSuperAdmin; // Only super-admin can delete
  const canSubmit = false; // Customers cannot submit anymore

  const refreshReport = useCallback(async () => {
    try {
      const response = await apiService.getReportById(report._id);
      if (response) {
        setReport(response);
      }
    } catch (error) {
      console.error('Error refreshing report:', error);
    }
  }, [report._id]);

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
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await apiService.deleteReportDocument(report._id, documentToDelete);
      await refreshReport();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleSubmitReport = () => {
    setSubmitDialogOpen(true);
  };

  const confirmSubmitReport = async () => {
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


  return (
    <div className="space-y-4 pb-4">
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

      {/* Original XLSX Report */}
      {report.originalAttachment && report.originalAttachment.s3Url && (
        <Card>
          <CardHeader>
            <CardTitle>Original Report</CardTitle>
            <CardDescription>Email report spreadsheet</CardDescription>
          </CardHeader>
          <CardContent>
            <XLSXViewer
              fileUrl={report.originalAttachment.s3Url}
              fileName={report.originalAttachment.fileName}
              fileSize={report.originalAttachment.fileSize}
            />
          </CardContent>
        </Card>
      )}

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
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              {uploading ? (
                <p className="text-sm text-gray-600">Uploading...</p>
              ) : isDragActive ? (
                <p className="text-sm text-purple-600 font-medium">Drop files here</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-1">
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
          {(!report.additionalAttachments || report.additionalAttachments.length === 0) &&
           report.documents.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No additional reports uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Additional Attachments */}
              {report.additionalAttachments && report.additionalAttachments.map((attachment, index) => (
                <div key={`additional-${index}`} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-purple-600" />
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
                      className="flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </a>
                  )}
                </div>
              ))}

              {/* Uploaded Documents */}
              {report.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-gray-600" />
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
                        className="flex items-center px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive={true}
      />

      {/* Submit Confirmation Dialog */}
      <ConfirmationDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={confirmSubmitReport}
        title="Submit Report"
        description="Are you sure you want to submit this report? You will not be able to delete files after submission."
        confirmText="Submit"
        cancelText="Cancel"
        destructive={false}
      />
    </div>
  );
};

export default ReportDetailsView;
