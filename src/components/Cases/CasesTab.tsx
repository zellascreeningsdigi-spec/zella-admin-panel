import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { Case } from '@/types/case';
import { Download, FileText, Plus, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import AddCaseDialog from './AddCaseDialog';
import BulkUploadDialog from './BulkUploadDialog';
import CasesTable from './CasesTable';

interface CaseStats {
  totalCases: number;
  pendingCases: number;
  completedCases: number;
  insufficiencyCases: number;
  digiLockerInitiated: number;
  digiLockerCompleted: number;
}

const CasesTab: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<CaseStats>({
    totalCases: 0,
    pendingCases: 0,
    completedCases: 0,
    insufficiencyCases: 0,
    digiLockerInitiated: 0,
    digiLockerCompleted: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const [casesResponse, statsResponse] = await Promise.all([
        apiService.getCases({ limit: 100 }),
        apiService.getCaseStats()
      ]);

      if (casesResponse.success && casesResponse.data) {
        // Transform backend data to match frontend Case interface
        const transformedCases = casesResponse.data.cases.map((backendCase: any) => ({
          _id: backendCase._id,
          id: backendCase._id,
          code: backendCase.code,
          date: backendCase.formSubmitDate || backendCase.createdAt,
          name: backendCase.name,
          phone: backendCase.phone,
          appNo: backendCase.appNo,
          companyName: backendCase.companyName,
          status: backendCase.status,
          digiLockerStatus: backendCase.digiLockerStatus,
          email: backendCase.email,
          address: backendCase.address,
          city: backendCase.city,
          state: backendCase.state,
          pin: backendCase.pin,
          formSubmitDate: backendCase.formSubmitDate,
          submittedBy: backendCase.submittedBy,
          syncStatus: backendCase.syncStatus,
          lastSyncedAt: backendCase.lastSyncedAt,
          digiLockerSessions: backendCase.digiLockerSessions,
          createdAt: backendCase.createdAt,
          updatedAt: backendCase.updatedAt
        }));

        setCases(transformedCases);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data.stats);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleAddCase = () => {
    setEditingCase(null);
    setIsAddCaseOpen(true);
  };

  const handleAddCaseClose = () => {
    setIsAddCaseOpen(false);
    setEditingCase(null);
  };

  const handleEditCase = (caseData: Case) => {
    setEditingCase(caseData);
    setIsAddCaseOpen(true);
  };

  const handleDeleteCase = (caseData: string | undefined) => {
    if (caseData) {
      apiService.deleteCase(caseData).then(() => {
        fetchCases();
      });
    }
    fetchCases();
  };

  const handleCaseAdded = () => {
    fetchCases();
  };

  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
  };

  const handleBulkUploadClose = () => {
    setIsBulkUploadOpen(false);
  };

  const handleBulkUploadSubmit = async (cases: any[]) => {
    try {
      setIsBulkUploading(true);
      console.log('Uploading cases:', cases);

      const response = await apiService.bulkCreateCases(cases);
      console.log('Response:', response);
      if (response.success && response.data) {
        // Refresh the cases list
        await fetchCases();

        // Show success message with details
        const { failed } = response.data;
        if (failed > 0) {
          alert(`Bulk upload completed: cases created successfully`);
        } else {
          alert(`Successfully uploaded  cases!`);
        }
      } else {
        throw new Error(response.message || 'Failed to upload cases');
      }
    } catch (error) {
      console.error('Error uploading cases:', error);
      alert(`Error uploading cases: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
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

  const handleRefresh = () => {
    fetchCases();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading cases...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-600 mt-1">
            Manage verification cases and DigiLocker integrations ({cases.length} total)
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleBulkUpload}>
            <FileText className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleAddCase}>
            <Plus className="h-4 w-4 mr-2" />
            Add Case
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedCases}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingCases}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Insufficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.insufficiencyCases}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DigiLocker Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.digiLockerInitiated}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DigiLocker Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.digiLockerCompleted}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Cases</CardTitle>
          <CardDescription>
            Manage and track all verification cases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CasesTable cases={cases} onCaseUpdated={fetchCases} onEditCase={handleEditCase} onDeleteCase={handleDeleteCase} />
        </CardContent>
      </Card>

      {/* Add Case Dialog */}
      <AddCaseDialog
        isOpen={isAddCaseOpen}
        onClose={handleAddCaseClose}
        onCaseAdded={handleCaseAdded}
        editCase={editingCase}
        onCaseUpdated={handleCaseAdded}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={handleBulkUploadClose}
        onUpload={handleBulkUploadSubmit}
        isUploading={isBulkUploading}
      />
    </div>
  );
};

export default CasesTab;