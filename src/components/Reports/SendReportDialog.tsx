import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Check, Mail, Upload, X, FileSpreadsheet, Eye } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';

interface SendReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const DEFAULT_MESSAGE_TEMPLATE = `Dear Sir,

Please find the attached Final Reports for the below mentioned employees.`;

const SendReportDialog: React.FC<SendReportDialogProps> = ({ isOpen, onClose, customer }) => {
  const { user } = useAuth();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [subject, setSubject] = useState('Final Employee Verification Reports');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showFooterPreview, setShowFooterPreview] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && customer) {
      // Reset state when modal opens
      setSelectedEmails([]);
      setMessageTemplate(DEFAULT_MESSAGE_TEMPLATE);
      setSubject('Final Employee Verification Reports');
      setExcelFile(null);
      setExcelData([]);
      setAdditionalFiles([]);
      setResult(null);
    }
  }, [isOpen, customer]);

  const handleToggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAll = () => {
    if (!customer) return;
    if (selectedEmails.length === customer.emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...customer.emails]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelFile(file);

    // Read and parse Excel file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setExcelData(jsonData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Failed to parse Excel file. Please ensure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setExcelFile(null);
    setExcelData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAdditionalFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file size (max 250MB per file)
    const maxSize = 250 * 1024 * 1024; // 200MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed'
    ];

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxSize) {
        alert(`${file.name}: File size must be less than 200MB`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: Invalid file type. Allowed types: PDF, Images (JPG, PNG), Word, Excel, ZIP`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAdditionalFiles((prev) => [...prev, ...validFiles]);
    }

    if (additionalFileInputRef.current) {
      additionalFileInputRef.current.value = '';
    }
  };

  const handleRemoveAdditionalFile = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReport = async () => {
    if (selectedEmails.length === 0 || !customer || !excelFile || additionalFiles.length === 0) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await apiService.sendCompanyReport(
        customer._id!,
        selectedEmails,
        subject,
        messageTemplate,
        excelFile,
        additionalFiles
      );

      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Reports sent successfully!',
          details: response.data
        });
      } else {
        setResult({
          success: false,
          message: response.message || 'Failed to send reports'
        });
      }
    } catch (error) {
      console.error('Error sending reports:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send reports. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Send Report to {customer.companyName}
          </DialogTitle>
          <DialogDescription>
            Upload an Excel report and send it to selected email addresses with a custom message.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-6 py-4">
              {/* Email Recipients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Select Recipients ({selectedEmails.length} of {customer.emails.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={sending}
                  >
                    {selectedEmails.length === customer.emails.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                  {customer.emails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleToggleEmail(email)}
                    >
                      <Checkbox
                        checked={selectedEmails.includes(email)}
                        onCheckedChange={() => handleToggleEmail(email)}
                        disabled={sending}
                      />
                      <label className="flex-1 text-sm cursor-pointer">{email}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Subject */}
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
                  Email Subject
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  disabled={sending}
                  className="mt-2"
                />
              </div>

              {/* Message Template */}
              <div>
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                  Message Template
                </Label>
                <textarea
                  id="message"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Enter your message here..."
                  disabled={sending}
                  rows={6}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Excel File Upload */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Upload Excel Report
                </Label>

                {!excelFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={sending}
                    />
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Excel File
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Upload .xlsx or .xls file (max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{excelFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(excelFile.size / 1024).toFixed(2)} KB • {excelData.length} rows
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={sending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Preview first few rows */}
                    {excelData.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                        <div className="text-xs bg-white border rounded p-2 max-h-32 overflow-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(excelData[0]).map((key, idx) => (
                                  <th key={idx} className="px-2 py-1 font-semibold text-gray-700">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {excelData.slice(0, 3).map((row, idx) => (
                                <tr key={idx} className="border-b">
                                  {Object.values(row).map((value: any, cellIdx) => (
                                    <td key={cellIdx} className="px-2 py-1 text-gray-600">
                                      {String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {excelData.length > 3 && (
                            <p className="text-center text-gray-500 mt-2">
                              ... and {excelData.length - 3} more rows
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Files Upload (Required) */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Additional Attachments <span className="text-red-500">*</span> ({additionalFiles.length} files)
                </Label>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors mb-3">
                  <input
                    ref={additionalFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={handleAdditionalFileUpload}
                    className="hidden"
                    disabled={sending}
                  />
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => additionalFileInputRef.current?.click()}
                    disabled={sending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Files
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, Images, Word, Excel, ZIP (max 200MB per file, multiple files supported)
                  </p>
                </div>

                {additionalFiles.length > 0 && (
                  <div className="space-y-2">
                    {additionalFiles.map((file, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdditionalFile(index)}
                            disabled={sending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Footer Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Email Footer Preview
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFooterPreview(!showFooterPreview)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showFooterPreview ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showFooterPreview && (
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">
                        {user?.name || 'Your Name'}{user?.designation ? ` | ${user.designation}` : ''}
                      </p>
                      <p className="font-semibold text-blue-700">Zella Screenings Private Limited</p>
                      <p className="text-gray-600 text-xs">
                        Corporate Employee Background Verification Services || Due Diligence
                      </p>
                      <p className="text-gray-700 text-xs mt-2">
                        New Delhi, India
                      </p>
                      <p className="text-gray-700 text-xs mt-2">
                        +91 9871967859
                      </p>
                      <p className="text-gray-700 text-xs">
                        {user?.email || 'your.email@zellascreenings.com'} || www.zellascreenings.com
                      </p>
                    </div>
                    {(!user?.name || !user?.designation) && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <p className="font-medium">💡 Tip: Update your profile to personalize the email footer</p>
                        <p className="mt-1">Go to your profile menu and click "Update Profile"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSendReport}
                disabled={selectedEmails.length === 0 || !excelFile || additionalFiles.length === 0 || sending}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to {selectedEmails.length} {selectedEmails.length === 1 ? 'Recipient' : 'Recipients'}
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
                  {result.success ? 'Reports Sent Successfully!' : 'Error Sending Reports'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>

                {result.success && result.details && (
                  <div className="mt-4 text-sm text-green-700">
                    <p>✓ {result.details.successCount} email(s) sent successfully</p>
                    {result.details.failureCount > 0 && (
                      <p className="text-red-700">✗ {result.details.failureCount} email(s) failed</p>
                    )}
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

export default SendReportDialog;
