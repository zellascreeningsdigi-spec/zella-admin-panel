import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Download, FileText, Upload } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';

interface BulkUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (cases: any[]) => void;
    isUploading?: boolean;
}

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface ParsedCase {
    code: string;
    name: string;
    phone: string;
    email: string;
    appNo: string;
    companyName?: string;
    address?: string;
    city: string;
    state: string;
    pin: string;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ isOpen, onClose, onUpload, isUploading = false }) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedCase[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const requiredFields = ['initiatorname', 'phone', 'email', 'city', 'state', 'pin'];
    const optionalFields = ['bgvid', 'appNo', 'companyName', 'address'];

    const generateCode = (index: number): string => {
        const number = (index + 1).toString().padStart(3, '0');
        return `ZS${number}`;
    };

    const generateAppNo = (index: number): string => {
        const number = (index + 1).toString().padStart(3, '0');
        return `APP${number}`;
    };

    const validateField = (value: any, field: string, row: number): string | null => {
        console.log(field, value);
        if (requiredFields.includes(field) && (!value || value.toString().trim() === '')) {
            return `${field} is required`;
        }

        if (field === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value.toString())) {
                return 'Invalid email format';
            }
        }

        if (field === 'phone' && value) {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(value.toString().replace(/\D/g, ''))) {
                return 'Phone must be 10 digits';
            }
        }

        if (field === 'pin' && value) {
            const pinRegex = /^[0-9]{6}$/;
            if (!pinRegex.test(value.toString())) {
                return 'PIN must be 6 digits';
            }
        }

        return null;
    };

    const parseFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setValidationErrors([]);
        setParsedData([]);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                setValidationErrors([{ row: 0, field: 'file', message: 'File must contain at least a header row and one data row' }]);
                setIsProcessing(false);
                return;
            }

            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1) as any[][];

            const errors: ValidationError[] = [];
            const cases: ParsedCase[] = [];

            dataRows.forEach((row, rowIndex) => {
                const caseData: any = {};

                // Map headers to case data
                headers.forEach((header, colIndex) => {
                    if (header) {
                        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
                        const value = row[colIndex];
                        caseData[normalizedHeader] = value;
                    }
                });

                // Validate required fields
                requiredFields.forEach(field => {
                    const error = validateField(caseData[field], field, rowIndex + 2);
                    if (error) {
                        errors.push({ row: rowIndex + 2, field, message: error });
                    }
                });

                // Validate optional fields if present
                optionalFields.forEach(field => {
                    if (caseData[field] !== undefined) {
                        const error = validateField(caseData[field], field, rowIndex + 2);
                        if (error) {
                            errors.push({ row: rowIndex + 2, field, message: error });
                        }
                    }
                });

                // Generate code and appNo if not provided
                const code = caseData.bgvid || generateCode(rowIndex);
                const appNo = caseData.appno || generateAppNo(rowIndex);

                cases.push({
                    code,
                    name: caseData.initiatorname || '',
                    phone: caseData.phone || '',
                    email: caseData.email || '',
                    appNo,
                    companyName: caseData.companyname || '',
                    address: caseData.address || '',
                    city: caseData.city || '',
                    state: caseData.state || '',
                    pin: caseData.pin || ''
                });
            });

            setValidationErrors(errors);
            setParsedData(cases);
        } catch (error) {
            console.error('Error parsing file:', error);
            setValidationErrors([{ row: 0, field: 'file', message: 'Error parsing file. Please ensure it\'s a valid Excel or CSV file.' }]);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'text/csv' ||
                file.name.endsWith('.xlsx') ||
                file.name.endsWith('.csv')) {
                setSelectedFile(file);
                parseFile(file);
            } else {
                setValidationErrors([{ row: 0, field: 'file', message: 'Please select an Excel (.xlsx) or CSV file' }]);
            }
        }
    }, [parseFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'text/csv' ||
                file.name.endsWith('.xlsx') ||
                file.name.endsWith('.csv')) {
                setSelectedFile(file);
                parseFile(file);
            } else {
                setValidationErrors([{ row: 0, field: 'file', message: 'Please select an Excel (.xlsx) or CSV file' }]);
            }
        }
    };

    const handleDownloadSample = () => {
        const sampleData = [
            {
                bgvid: 'ZS001',
                initiatorName: 'John Doe',
                phone: '9876543210',
                email: 'john.doe@example.com',
                appNo: 'APP001',
                companyName: 'ABC Company',
                address: '123 Main Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pin: '400001'
            },
            {
                bgvid: 'ZS002',
                initiatorName: 'Jane Smith',
                phone: '9876543211',
                email: 'jane.smith@example.com',
                appNo: 'APP002',
                companyName: 'XYZ Corp',
                address: '456 Park Avenue',
                city: 'Delhi',
                state: 'Delhi',
                pin: '110001'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cases');
        XLSX.writeFile(wb, 'case_template.xlsx');
    };

    const handleUpload = () => {
        if (parsedData.length > 0 && validationErrors.length === 0) {
            onUpload(parsedData);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setParsedData([]);
        setValidationErrors([]);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Cases</DialogTitle>
                    <DialogDescription>
                        Upload an Excel or CSV file to create multiple cases at once. Download the sample file to see the required format.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* File Upload Area */}
                    <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                        <div
                            className={`p-8 text-center ${dragActive ? 'bg-blue-50 border-blue-400' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <div className="space-y-2">
                                <p className="text-lg font-medium">
                                    {selectedFile ? selectedFile.name : 'Drop your file here or click to browse'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Supports Excel (.xlsx) and CSV files
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx,.csv"
                                    onChange={handleFileInput}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="mt-4"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Choose File
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Sample Download */}
                    <div className="flex justify-center">
                        <Button variant="outline" onClick={handleDownloadSample}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Sample File
                        </Button>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <Card className="border-red-200 bg-red-50">
                            <div className="p-4">
                                <div className="flex items-center mb-2">
                                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                    <h3 className="font-medium text-red-800">Validation Errors</h3>
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {validationErrors.map((error, index) => (
                                        <p key={index} className="text-sm text-red-700">
                                            Row {error.row}: {error.message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Parsed Data Preview */}
                    {parsedData.length > 0 && validationErrors.length === 0 && (
                        <Card>
                            <div className="p-4">
                                <div className="flex items-center mb-4">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                    <h3 className="font-medium text-green-800">
                                        {parsedData.length} cases ready to upload
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">BGVID</th>
                                                <th className="text-left p-2">Initiator Name</th>
                                                <th className="text-left p-2">Phone</th>
                                                <th className="text-left p-2">Email</th>
                                                <th className="text-left p-2">App No</th>
                                                <th className="text-left p-2">City</th>
                                                <th className="text-left p-2">State</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 5).map((caseData, index) => (
                                                <tr key={index} className="border-b">
                                                    <td className="p-2">{caseData.code}</td>
                                                    <td className="p-2">{caseData.name}</td>
                                                    <td className="p-2">{caseData.phone}</td>
                                                    <td className="p-2">{caseData.email}</td>
                                                    <td className="p-2">{caseData.appNo}</td>
                                                    <td className="p-2">{caseData.city}</td>
                                                    <td className="p-2">{caseData.state}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedData.length > 5 && (
                                        <p className="text-sm text-gray-500 mt-2">
                                            ... and {parsedData.length - 5} more cases
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Processing Indicator */}
                    {isProcessing && (
                        <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                            <span className="text-gray-600">Processing file...</span>
                        </div>
                    )}

                    {/* Uploading Indicator */}
                    {isUploading && (
                        <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-2"></div>
                            <span className="text-gray-600">Uploading cases to server...</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={parsedData.length === 0 || validationErrors.length > 0 || isProcessing || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                            </>
                        ) : (
                            `Upload ${parsedData.length} Cases`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkUploadDialog;
