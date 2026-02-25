import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Upload, Eye, Calendar, FolderOpen, Search, Trash2, X, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DocumentCollection } from '@/types/documentCollection';
import apiService from '@/services/api';

const DOCUMENT_SLOTS = [
  { docType: 'aadhaar', fieldName: 'aadhaar', label: 'Aadhaar' },
  { docType: 'pan', fieldName: 'pan', label: 'PAN' },
  { docType: 'degree_marksheet', fieldName: 'degreeMarksheet', label: 'Degree / Marksheet' },
  { docType: 'address_proof', fieldName: 'addressProof', label: 'Address Proof' },
  { docType: 'passport', fieldName: 'passport', label: 'Passport' },
  { docType: 'passport_declaration', fieldName: 'passportDeclaration', label: 'Passport Declaration' },
  { docType: 'relieving_letter', fieldName: 'relievingLetter', label: 'Relieving Letter' },
  { docType: 'pay_slip', fieldName: 'paySlip', label: 'Pay Slip' },
  { docType: 'offer_letter', fieldName: 'offerLetter', label: 'Offer Letter' },
  { docType: 'cv', fieldName: 'cv', label: 'CV / Resume' },
  { docType: 'signature', fieldName: 'signature', label: 'Signature' },
];

const isImage = (filename: string) => /\.(jpg|jpeg|png)$/i.test(filename);
const isPDF = (filename: string) => /\.pdf$/i.test(filename);

const DocumentCollectionDocumentsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const companyContext = {
    selectedCompanyId: location.state?.selectedCompanyId,
    selectedCompanyName: location.state?.selectedCompanyName,
  };

  const [collection, setCollection] = useState<DocumentCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [activeUploadDocType, setActiveUploadDocType] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCollection = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await apiService.getDocumentCollectionById(id);
      if (response.success && response.data) {
        setCollection(response.data);
      } else {
        throw new Error('Not found');
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
      alert('Failed to load document collection');
      navigate(`/document-collections/${id}`, { state: companyContext });
    } finally {
      setLoading(false);
    }
  };

  const activeSlots = useMemo(() => {
    const builtInSlots = DOCUMENT_SLOTS.filter(slot => {
      const key = slot.fieldName as keyof NonNullable<NonNullable<typeof collection>['formConfig']>['documentTypes'];
      return collection?.formConfig?.documentTypes?.[key] !== false;
    }).map(slot => ({ ...slot, isCustom: false }));

    // Append enabled custom document types
    const customTypes = collection?.formConfig?.customDocumentTypes || [];
    const customSlots = customTypes
      .filter(ct => ct.enabled)
      .map(ct => ({
        docType: ct.key,
        fieldName: ct.key,
        label: ct.label,
        isCustom: true,
      }));

    return [...builtInSlots, ...customSlots];
  }, [collection]);

  const getUploadedDocuments = () => {
    if (!collection) return [];
    return activeSlots
      .map(slot => {
        const doc = slot.isCustom
          ? collection.customDocuments?.[slot.fieldName] as any
          : collection.documents?.[slot.fieldName as keyof typeof collection.documents] as any;
        if (doc && doc.docName) {
          return { ...doc, docType: slot.docType, fieldName: slot.fieldName, label: slot.label };
        }
        return null;
      })
      .filter(Boolean);
  };

  const handleDeleteDocument = async (docType: string, label: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete the ${label} document?`)) return;
    setDeletingDoc(docType);
    try {
      const response = await apiService.deleteDocumentCollectionDocument(id, docType);
      if (response.success) {
        await fetchCollection();
      } else {
        throw new Error(response.message || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Delete document error:', error);
      alert(error.message || 'Failed to delete document');
    } finally {
      setDeletingDoc(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      await apiService.downloadAllDocumentCollectionDocuments(id);
    } catch (error: any) {
      console.error('Download all error:', error);
      alert(error.message || 'Failed to download documents');
    } finally {
      setDownloading(false);
    }
  };

  const triggerFileUpload = (docType: string) => {
    setActiveUploadDocType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadDocType) return;
    await handleUploadDocument(file, activeUploadDocType);
    setActiveUploadDocType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadDocument = async (file: File, docType: string) => {
    if (!id) return;
    setUploadingDoc(docType);
    try {
      const response = await apiService.adminUploadDocumentCollectionFile(id, file, docType);
      if (response.success) {
        await fetchCollection();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload document error:', error);
      alert(error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-gray-600">Not found</p>
          <Button onClick={() => navigate('/dashboard', { state: { activeTab: 'document-collection' } })} className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-teal-500 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/document-collections/${id}`, { state: companyContext })}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Back to Details
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                <p className="text-sm text-gray-500">
                  {collection.name} &bull; {collection.companyName} &bull; <span className="font-mono">{collection.code}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Uploaded Documents Card */}
        <Card>
          <CardHeader className="bg-teal-50 border-b border-teal-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" /> Uploaded Documents ({getUploadedDocuments().length} / {activeSlots.length} uploaded)
              </CardTitle>
              <div className="flex items-center gap-2">
                {getUploadedDocuments().length > 0 && (
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {downloading ? (
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {downloading ? 'Downloading...' : 'Download All'}
                  </Button>
                )}
                <Button
                  onClick={() => setShowAllDocuments(!showAllDocuments)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  {showAllDocuments ? 'Show by Type' : 'View All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />

            {/* Search Bar */}
            {getUploadedDocuments().length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {searchQuery && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-teal-800">
                  Found <strong>{getUploadedDocuments().filter((doc: any) =>
                    doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.label.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length}</strong> document(s) matching "{searchQuery}"
                </p>
              </div>
            )}

            {/* View All - Flat List */}
            {showAllDocuments && (
              <>
                {(() => {
                  const uploaded = getUploadedDocuments();
                  const filtered = uploaded.filter((doc: any) =>
                    !searchQuery ||
                    doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.label.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
                      </div>
                    );
                  }

                  return (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">All Uploaded Documents</h3>
                      <div className="space-y-2">
                        {filtered.map((doc: any) => (
                          <div
                            key={doc.docType}
                            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-teal-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.docName}</p>
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium text-teal-600">{doc.label}</span>
                                  {doc.uploadedAt && ` • ${new Date(doc.uploadedAt).toLocaleDateString('en-IN')}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {doc.s3Url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.s3Url, '_blank')}
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.docType, doc.label)}
                                disabled={deletingDoc === doc.docType}
                                className="hover:bg-red-50 hover:border-red-200"
                                title="Delete"
                              >
                                {deletingDoc === doc.docType ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Grid View (default) */}
            {!showAllDocuments && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSlots.map((slot) => {
                  const doc = slot.isCustom
                    ? collection.customDocuments?.[slot.fieldName] as any
                    : collection.documents?.[slot.fieldName as keyof typeof collection.documents] as any;
                  const isUploading = uploadingDoc === slot.docType;

                  // Apply search filter
                  if (searchQuery) {
                    const matchesSearch = slot.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (doc?.docName && doc.docName.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (!matchesSearch) return null;
                  }

                  if (doc && doc.docName) {
                    return (
                      <div key={slot.docType} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          {isImage(doc.docName) ? (
                            <img
                              src={doc.s3Url}
                              alt={slot.label}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setSelectedImage(doc.s3Url)}
                            />
                          ) : isPDF(doc.docName) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-16 h-16 text-red-500" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-gray-700 font-semibold text-base">{slot.label}</Label>
                            <div className="flex items-center gap-1">
                              <a
                                href={doc.s3Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                title="View document"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => triggerFileUpload(slot.docType)}
                                disabled={isUploading}
                                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:opacity-50"
                                title="Replace document"
                              >
                                {isUploading ? (
                                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(slot.docType, slot.label)}
                                disabled={deletingDoc === slot.docType}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                title="Delete document"
                              >
                                {deletingDoc === slot.docType ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate mb-2" title={doc.docName}>
                            {doc.docName}
                          </p>
                          {doc.uploadedAt && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                            </p>
                          )}
                          <a
                            href={doc.s3Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline text-sm font-medium"
                          >
                            View Full Document →
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.docType}
                      className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
                    >
                      <div className="aspect-video flex flex-col items-center justify-center p-6">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <Label className="text-gray-600 font-semibold text-base mb-2">{slot.label}</Label>
                        <p className="text-sm text-gray-400 mb-4">No document uploaded</p>
                        <Button
                          onClick={() => triggerFileUpload(slot.docType)}
                          disabled={isUploading}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentCollectionDocumentsPage;
