import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkUploadDialog = ({ open, onClose, onSuccess }: BulkUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    created: number;
    failed: number;
    errors?: any[];
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel data to verification format
      const verifications = jsonData.map((row: any) => ({
        code: row['Code'] || row['code'] || '',
        name: row['Name'] || row['name'] || '',
        phone: row['Phone'] || row['phone'] || '',
        email: row['Email'] || row['email'] || '',
        companyName: row['Company'] || row['companyName'] || row['company'] || '',
        address: row['Address'] || row['address'] || '',
        city: row['City'] || row['city'] || '',
        state: row['State'] || row['state'] || '',
        pin: row['PIN'] || row['pin'] || '',
        landmark: row['Landmark'] || row['landmark'] || '',
        addressType: row['Address Type'] || row['addressType'] || 'current',
        verificationMethod: row['Verification Method'] || row['verificationMethod'] || 'self',
      }));

      // Upload to backend
      const response = await apiService.bulkCreateAddressVerifications(verifications);

      if (response.success && response.data) {
        setResults(response.data);
        if (response.data.created > 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        alert('Failed to upload verifications');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const template = [
      {
        Code: 'AV001',
        Name: 'John Doe',
        Phone: '9876543210',
        Email: 'john@example.com',
        Company: 'ABC Corp',
        Address: '123 Main Street, Apartment 4B',
        City: 'Mumbai',
        State: 'Maharashtra',
        PIN: '400001',
        Landmark: 'Near Central Park',
        'Address Type': 'current',
        'Verification Method': 'self',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Verifications');
    XLSX.writeFile(workbook, 'address_verification_template.xlsx');
  };

  const handleClose = () => {
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Address Verifications</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">
              Download the Excel template to ensure proper formatting
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the Excel file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">Drag & drop an Excel file here, or click to select</p>
                <p className="text-sm text-gray-400">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Processing file...</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Created: {results.created}</span>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Failed: {results.failed}</span>
                  </div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                  <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.created > 0 && (
                <p className="text-sm text-green-600 text-center">
                  Successfully uploaded {results.created} verification(s)!
                </p>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;
