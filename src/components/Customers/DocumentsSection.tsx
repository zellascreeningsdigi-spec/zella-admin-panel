import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { Customer, CustomerDocument } from '@/types/customer';
import { Archive, Check, Download, Edit2, FileText, FolderOpen, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomerDocuments(customer._id!);
      if (response.success && response.data) {
        // Documents are already filtered by the backend based on user role
        // Super-admin and Admin receive all documents
        // Operator and Customer users receive only documents they uploaded
        setDocuments(response.data.documents || []);
        setDocumentsRequired(response.data.documentsRequired || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [customer._id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const handleAddDocumentRequirement = async () => {
    if (!newDocName.trim()) {
      alert('Please enter a document name');
      return;
    }

    try {
      const response = await apiService.addDocumentRequirement(customer._id!, newDocName.trim());
      if (response.success && response.data) {
        setDocumentsRequired(response.data.documentsRequired);
        setNewDocName('');
        setAddingNew(false);
        onDocumentsUpdated?.();
      } else {
        throw new Error(response.message || 'Failed to add document requirement');
      }
    } catch (error) {
      console.error('Error adding document requirement:', error);
      alert(`Failed to add: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleSaveEdit = async (index: number) => {
    if (!editingValue.trim()) {
      alert('Document name cannot be empty');
      return;
    }

    if (editingValue.trim() === documentsRequired[index]) {
      // No change
      handleCancelEdit();
      return;
    }

    try {
      const response = await apiService.renameDocumentRequirement(customer._id!, index, editingValue.trim());
      if (response.success && response.data) {
        setDocumentsRequired(response.data.documentsRequired);
        await fetchDocuments(); // Refresh to get updated document names
        handleCancelEdit();
        onDocumentsUpdated?.();
      } else {
        throw new Error(response.message || 'Failed to rename document requirement');
      }
    } catch (error) {
      console.error('Error renaming document requirement:', error);
      alert(`Failed to rename: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  const handleDeleteDocumentRequirement = async (index: number) => {
    const documentName = documentsRequired[index];
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This can only be done if no documents are uploaded for it.`)) {
      return;
    }

    try {
      const response = await apiService.deleteDocumentRequirement(customer._id!, index);
      if (response.success && response.data) {
        setDocumentsRequired(response.data.documentsRequired);
        onDocumentsUpdated?.();
      } else {
        throw new Error(response.message || 'Failed to delete document requirement');
      }
    } catch (error) {
      console.error('Error deleting document requirement:', error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Please try again'}`);
    }
  };

  const handleDownloadAll = async () => {
    if (documents.length === 0) {
      alert('No documents available to download');
      return;
    }

    try {
      setDownloading(true);
      await apiService.downloadAllDocuments(customer._id!);
    } catch (error) {
      console.error('Error downloading all documents:', error);
      alert(`Failed to download: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setDownloading(false);
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
    [handleFileUpload]
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

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }

    const query = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.originalName.toLowerCase().includes(query) ||
      doc.name.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  // Get filtered documents for a specific document name
  const getFilteredDocumentsForName = (documentName: string): CustomerDocument[] => {
    return filteredDocuments.filter((doc) => doc.name === documentName);
  };

  // Check if a document requirement has any matching documents after filtering
  const hasMatchingDocuments = (documentName: string): boolean => {
    return filteredDocuments.some((doc) => doc.name === documentName);
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

  // Highlight search matches in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Required Documents ({documents.length} total)</CardTitle>
            <CardDescription>
              Manage document requirements and upload files below.
              {user?.role !== 'super-admin' && user?.role !== 'admin' && (
                <span className="block text-xs text-amber-600 mt-1">
                  You can only view documents you have uploaded. Admin and Super-admin can see all documents.
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {documents.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllDocuments(!showAllDocuments)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {showAllDocuments ? 'Show by Type' : 'View All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={downloading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {downloading ? 'Downloading...' : 'Download All'}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingNew(true)}
              disabled={addingNew}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document Type
            </Button>
          </div>
        </div>
        {/* Search Bar */}
        {documents.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search documents by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Document Requirement */}
        {addingNew && (
          <div className="border-2 border-dashed border-blue-500 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2">
              <Input
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Enter document name (e.g., Aadhaar Card)"
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDocumentRequirement();
                  } else if (e.key === 'Escape') {
                    setAddingNew(false);
                    setNewDocName('');
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddDocumentRequirement}
                disabled={!newDocName.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddingNew(false);
                  setNewDocName('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Search Results Summary */}
        {searchQuery && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Found <strong>{filteredDocuments.length}</strong> document(s) matching "{searchQuery}"
            </p>
          </div>
        )}

        {/* View All Documents Section */}
        {showAllDocuments && filteredDocuments.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">All Uploaded Documents</h3>
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const isSuperAdmin = user?.role === 'super-admin';
                return (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {searchQuery ? highlightText(doc.originalName, searchQuery) : doc.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-blue-600">{doc.name}</span> • {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
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
          </div>
        )}

        {/* Existing Document Requirements */}
        {!showAllDocuments && documentsRequired.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No document requirements yet. Click "Add Document Type" to get started.
          </p>
        )}

        {!showAllDocuments && documentsRequired.length > 0 && (
          documentsRequired.map((documentName, index) => {
            const uploadedDocs = getDocumentsForName(documentName);
            const filteredUploadedDocs = getFilteredDocumentsForName(documentName);
            const isDraggedOver = dragOver === documentName;
            const isEditing = editingIndex === index;

            // Hide sections with no matching documents when searching
            if (searchQuery && !hasMatchingDocuments(documentName)) {
              return null;
            }

            return (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 max-w-md"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(index);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(index)}
                        disabled={!editingValue.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{documentName}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(index, documentName)}
                          className="h-7 w-7 p-0"
                          title="Edit name"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {uploadedDocs.length} uploaded
                          {user?.role !== 'super-admin' && user?.role !== 'admin' && uploadedDocs.length > 0 && (
                            <span className="text-xs text-amber-600 ml-1">(yours)</span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocumentRequirement(index)}
                          className="h-7 w-7 p-0 hover:bg-red-50"
                          title={uploadedDocs.length > 0 ? "Cannot delete - documents uploaded" : "Delete requirement"}
                          disabled={uploadedDocs.length > 0}
                        >
                          <Trash2 className={`h-3.5 w-3.5 ${uploadedDocs.length > 0 ? 'text-gray-300' : 'text-red-600'}`} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Upload Area */}
                {!isEditing && (
                  <>
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
                      <p className="text-xs text-gray-400">PDF, JPG, PNG, DOC, ZIP Max (100 Mb) each file</p>
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
                    {filteredUploadedDocs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Uploaded Files:
                          {searchQuery && uploadedDocs.length !== filteredUploadedDocs.length && (
                            <span className="text-xs text-gray-500 ml-2">
                              (showing {filteredUploadedDocs.length} of {uploadedDocs.length})
                            </span>
                          )}
                        </p>
                        {filteredUploadedDocs.map((doc) => {
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
                                    {searchQuery ? highlightText(doc.originalName, searchQuery) : doc.originalName}
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
                  </>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsSection;
