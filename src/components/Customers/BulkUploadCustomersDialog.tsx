import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { AlertCircle, Check, Download, Upload, X } from 'lucide-react';
import React, { useState } from 'react';

interface BulkUploadCustomersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const BulkUploadCustomersDialog: React.FC<BulkUploadCustomersDialogProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    created?: number;
    failed?: number;
    errors?: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validExtensions = ['csv', 'xlsx', 'xls'];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension && validExtensions.includes(fileExtension)) {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Please select a valid CSV or Excel file');
        e.target.value = '';
      }
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/customers/sample-file', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download sample file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading sample file:', error);
      alert('Failed to download sample file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/customers/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          created: data.data?.created || 0,
          failed: data.data?.failed || 0,
          errors: data.data?.errors
        });
        onUploadComplete();
      } else {
        setResult({
          success: false,
          message: data.message || 'Upload failed',
          errors: data.errors
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Bulk Upload Customers
          </DialogTitle>
          <DialogDescription>
            Upload multiple customers at once using a CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="py-4 space-y-4">
              {/* Download Sample */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Need a template?
                    </p>
                    <p className="text-xs text-blue-800">
                      Download the sample file to see the correct format for bulk upload
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSample}
                    className="ml-3"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sample
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select File
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                </div>
                {file && (
                  <p className="text-xs text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  File Format Requirements
                </p>
                <ul className="text-xs text-amber-800 space-y-1 ml-6 list-disc">
                  <li>File must be CSV or Excel (.xlsx, .xls) format</li>
                  <li>Required columns: "Company Name", "Email 1"</li>
                  <li>Optional columns: "Email 2", "Email 3", "Email 4", "Email 5", "Documents Required"</li>
                  <li>Documents Required should be comma-separated (e.g., "Aadhaar Card,PAN Card")</li>
                  <li>Each customer must have at least one email address</li>
                  <li>Duplicate company names will be skipped</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-6">
              <div
                className={`rounded-lg p-6 text-center ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                ) : (
                  <X className="h-12 w-12 text-red-600 mx-auto mb-3" />
                )}
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Upload Successful!' : 'Upload Failed'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>

                {result.success && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-center space-x-6 text-sm">
                      <div className="text-green-700">
                        <span className="font-semibold text-lg">{result.created}</span>
                        <p className="text-xs">Created</p>
                      </div>
                      {result.failed && result.failed > 0 && (
                        <div className="text-red-700">
                          <span className="font-semibold text-lg">{result.failed}</span>
                          <p className="text-xs">Failed</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4 text-left max-h-64 overflow-y-auto">
                    <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
                    <div className="bg-white rounded border border-red-200 p-3 space-y-1">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-700">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadCustomersDialog;
