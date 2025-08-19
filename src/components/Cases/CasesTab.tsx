import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, FileText, RefreshCw } from 'lucide-react';
import CasesTable from './CasesTable';
import { Case } from '@/types/case';
import { apiService } from '@/services/api';

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
          id: backendCase.phpCaseId || backendCase._id,
          phpCaseId: backendCase.phpCaseId,
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
    console.log('Add new case');
  };

  const handleBulkUpload = () => {
    console.log('Bulk upload cases');
  };

  const handleDownloadTemplate = () => {
    console.log('Download CSV template');
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
            Manage and track all verification cases. Cases added via PHP application will appear here automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CasesTable cases={cases} onCaseUpdated={fetchCases} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CasesTab;