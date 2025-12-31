import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileText, Download, Loader2 } from 'lucide-react';

interface XLSXViewerProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

const XLSXViewer: React.FC<XLSXViewerProps> = ({ fileUrl, fileName, fileSize }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[][]>([]);

  useEffect(() => {
    const fetchAndParseXLSX = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use backend proxy to avoid CORS issues
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const proxyUrl = `${API_BASE_URL}/reports/proxy-file?url=${encodeURIComponent(fileUrl)}`;

        // Get auth token from localStorage (same key as apiService)
        const token = localStorage.getItem('auth_token');

        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setData(jsonData as any[][]);
      } catch (err) {
        console.error('Error parsing XLSX:', err);
        setError('Failed to load spreadsheet');
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseXLSX();
  }, [fileUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-8 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-center space-x-3 text-blue-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading spreadsheet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* File Header */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-t-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </a>
      </div>

      {/* Spreadsheet Content */}
      {data.length > 0 ? (
        <div className="overflow-auto border border-blue-200 rounded-b-lg max-h-96">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <tbody className="divide-y divide-gray-200">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-blue-100 sticky top-0' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-2 text-sm ${
                        rowIndex === 0
                          ? 'font-semibold text-blue-900'
                          : 'text-gray-900'
                      } whitespace-nowrap border-r border-gray-200 last:border-r-0`}
                    >
                      {cell !== null && cell !== undefined ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 border border-blue-200 rounded-b-lg bg-white">
          No data in spreadsheet
        </div>
      )}
    </div>
  );
};

export default XLSXViewer;
