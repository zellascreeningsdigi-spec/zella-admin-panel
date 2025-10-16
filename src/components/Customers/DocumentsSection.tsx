import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Customer, CustomerDocument } from '@/types/customer';
import { Download, FileText, Trash2, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface DocumentsSectionProps {
  customer: Customer;
  onDocumentsUpdated?: () => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ customer, onDocumentsUpdated }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [documentsRequired, setDocumentsRequired] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [customer._id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomerDocuments(customer._id!);
      if (response.success && response.data) {
        setDocuments(response.data.documents || []);
        setDocumentsRequired(response.data.documentsRequired || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentName: string) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', documentName);

      const response = await apiService.uploadCustomerDocument(customer._id!, formData);

      if (response.success) {
        await fetchDocuments();
        onDocumentsUpdated?.();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await apiService.deleteCustomerDocument(customer._id!, docId);
      if (response.success) {
        await fetchDocuments();
        onDocumentsUpdated?.();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent, documentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(documentName);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, documentName: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Upload all files
        files.forEach(file => {
          handleFileUpload(file, documentName);
        });
      }
    },
    [customer._id]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, documentName: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Upload all selected files
      Array.from(files).forEach(file => {
        handleFileUpload(file, documentName);
      });
    }
  };

  const getDocumentsForName = (documentName: string): CustomerDocument[] => {
    return documents.filter((doc) => doc.name === documentName);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading documents...</p>
        </CardContent>
      </Card>
    );
  }

  if (documentsRequired.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>No documents required for this customer</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Required Documents</CardTitle>
        <CardDescription>
          Upload the required documents below. Drag and drop multiple files or click to browse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {documentsRequired.map((documentName, index) => {
          const uploadedDocs = getDocumentsForName(documentName);
          const isDraggedOver = dragOver === documentName;

          return (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{documentName}</h3>
                <span className="text-sm text-gray-500">
                  {uploadedDocs.length} uploaded
                </span>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDraggedOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={(e) => handleDragOver(e, documentName)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, documentName)}
              >
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Drag and drop your files here, or click to browse
                </p>
                <p className="text-xs text-gray-400">PDF, JPG, PNG, DOC, ZIP (Max 10MB)</p>
                <input
                  type="file"
                  id={`file-${index}`}
                  className="hidden"
                  onChange={(e) => handleFileInputChange(e, documentName)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"
                  disabled={uploading}
                  multiple
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => document.getElementById(`file-${index}`)?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>

              {/* Uploaded Documents */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                  {uploadedDocs.map((doc) => {
                    const isSuperAdmin = user?.role === 'super-admin';
                    return (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.originalName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                              {doc.uploadedBy && ` • by ${doc.uploadedBy.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.s3Url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.s3Url, '_blank')}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileDelete(doc._id)}
                              className="hover:bg-red-50 hover:border-red-200"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DocumentsSection;
