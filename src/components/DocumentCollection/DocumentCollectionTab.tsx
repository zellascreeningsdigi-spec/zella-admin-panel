import { useState, useEffect } from 'react';
import { Plus, Upload, Download, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { DocumentCollection, DocumentCollectionStats, CompanySummary } from '@/types/documentCollection';
import DocumentCollectionTable from './DocumentCollectionTable';
import CompanyListTable from './CompanyListTable';
import AddDocumentCollectionDialog from './AddDocumentCollectionDialog';
import BulkUploadDialog from './BulkUploadDialog';
import DocumentCollectionFilters from './DocumentCollectionFilters';
import BGVFormConfigEditor from './BGVFormConfigEditor';

interface DocumentCollectionTabProps {
  initialSelectedCompanyId?: string;
  initialSelectedCompanyName?: string;
}

const DocumentCollectionTab = ({
  initialSelectedCompanyId,
  initialSelectedCompanyName,
}: DocumentCollectionTabProps) => {
  // Company list state (Level 1)
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Selected company (Level 2)
  const [selectedCompany, setSelectedCompany] = useState<{ customerId: string; companyName: string } | null>(null);

  // Candidate list state (Level 2)
  const [collections, setCollections] = useState<DocumentCollection[]>([]);
  const [stats, setStats] = useState<DocumentCollectionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    linkSent: 0,
    completed: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<DocumentCollection | null>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>();
  const [preselectedCompanyName, setPreselectedCompanyName] = useState<string | undefined>();
  const [filters, setFilters] = useState({
    status: '',
    verificationStatus: '',
    search: ''
  });

  // On mount: restore Level 2 from navigation state
  useEffect(() => {
    if (initialSelectedCompanyId && initialSelectedCompanyName) {
      setSelectedCompany({
        customerId: initialSelectedCompanyId,
        companyName: initialSelectedCompanyName,
      });
    }
  }, [initialSelectedCompanyId, initialSelectedCompanyName]);

  // Fetch companies when on Level 1
  useEffect(() => {
    if (!selectedCompany) {
      fetchCompanies();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, companySearch]);

  // Fetch candidates when on Level 2
  useEffect(() => {
    if (selectedCompany) {
      fetchCollections();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, filters]);

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      const response = await apiService.getDocumentCollectionCompanies({
        search: companySearch || undefined,
      });
      if (response.success && response.data) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchCollections = async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      const response = await apiService.getDocumentCollections({
        ...filters,
        customerId: selectedCompany.customerId,
        page: 1,
        limit: 100
      });

      if (response.success && response.data) {
        setCollections(response.data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      alert('Failed to load document collections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getDocumentCollectionStats(
        selectedCompany ? { customerId: selectedCompany.customerId } : undefined
      );
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Level 1 handlers
  const handleSelectCompany = (company: CompanySummary) => {
    setSelectedCompany({ customerId: company.customerId, companyName: company.companyName });
    setFilters({ status: '', verificationStatus: '', search: '' });
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setCollections([]);
  };

  const handleAddCandidateForCompany = (company: CompanySummary) => {
    setPreselectedCustomerId(company.customerId);
    setPreselectedCompanyName(company.companyName);
    setEditingCollection(null);
    setIsAddDialogOpen(true);
  };

  const handleSendAllLinks = async (company: CompanySummary) => {
    if (company.notInitiated === 0) {
      alert('No candidates with "Not Sent" status for this company.');
      return;
    }
    if (!window.confirm(`Send BGV form links to all ${company.notInitiated} unsent candidates of ${company.companyName}?`)) {
      return;
    }
    try {
      const response = await apiService.sendAllDocumentCollectionLinks(company.customerId);
      if (response.success) {
        alert(response.message || 'Links sent successfully!');
        fetchCompanies();
        if (selectedCompany) {
          fetchCollections();
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Send all links error:', error);
      alert('Failed to send links');
    }
  };

  // Level 2 handlers
  const handleAdd = () => {
    if (selectedCompany) {
      setPreselectedCustomerId(selectedCompany.customerId);
      setPreselectedCompanyName(selectedCompany.companyName);
    } else {
      setPreselectedCustomerId(undefined);
      setPreselectedCompanyName(undefined);
    }
    setEditingCollection(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (collection: DocumentCollection) => {
    setPreselectedCustomerId(undefined);
    setPreselectedCompanyName(undefined);
    setEditingCollection(collection);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document collection?')) {
      return;
    }
    try {
      const response = await apiService.deleteDocumentCollection(id);
      if (response.success) {
        alert('Document collection deleted successfully');
        fetchCollections();
        fetchStats();
        fetchCompanies();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document collection');
    }
  };

  const handleSendLink = async (collection: DocumentCollection) => {
    if (!collection._id) return;
    if (!window.confirm(`Send BGV form link to ${collection.email}?`)) {
      return;
    }
    try {
      const response = await apiService.sendDocumentCollectionLink(collection._id);
      if (response.success) {
        alert('Link sent successfully!');
        fetchCollections();
        fetchCompanies();
      }
    } catch (error) {
      console.error('Send link error:', error);
      alert('Failed to send link');
    }
  };

  const handleDialogSuccess = () => {
    setIsAddDialogOpen(false);
    setEditingCollection(null);
    setPreselectedCustomerId(undefined);
    setPreselectedCompanyName(undefined);
    if (selectedCompany) {
      fetchCollections();
    }
    fetchCompanies();
    fetchStats();
  };

  const handleBulkUploadSuccess = () => {
    setIsBulkUploadOpen(false);
    if (selectedCompany) {
      fetchCollections();
    }
    fetchCompanies();
    fetchStats();
  };

  const handleExport = () => {
    alert('Export functionality will be implemented');
  };

  // Stats cards (shared between Level 1 & 2)
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Collections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Completed Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
        </CardContent>
      </Card>
    </div>
  );

  // ========== LEVEL 1: Companies List ==========
  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Documents Collection</h2>
            <p className="text-gray-500">Manage BGV form collection and document uploads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Collection
            </Button>
          </div>
        </div>

        {renderStats()}

        <div className="bg-white p-4 rounded-lg border">
          <Input
            placeholder="Search companies..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <CompanyListTable
          companies={companies}
          loading={companiesLoading}
          onSelectCompany={handleSelectCompany}
          onAddCandidate={handleAddCandidateForCompany}
          onSendAllLinks={handleSendAllLinks}
        />

        <AddDocumentCollectionDialog
          open={isAddDialogOpen}
          onClose={() => {
            setIsAddDialogOpen(false);
            setEditingCollection(null);
            setPreselectedCustomerId(undefined);
            setPreselectedCompanyName(undefined);
          }}
          onSuccess={handleDialogSuccess}
          editCollection={editingCollection}
          preselectedCustomerId={preselectedCustomerId}
          preselectedCompanyName={preselectedCompanyName}
        />

        <BulkUploadDialog
          open={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      </div>
    );
  }

  // ========== LEVEL 2: Company Candidates ==========
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToCompanies} className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back to Companies
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedCompany.companyName} - Candidates</h2>
            <p className="text-gray-500">Manage candidates for this company</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {renderStats()}

      <BGVFormConfigEditor
        customerId={selectedCompany.customerId}
        companyName={selectedCompany.companyName}
      />

      <DocumentCollectionFilters
        filters={filters}
        onFilterChange={setFilters}
      />

      <DocumentCollectionTable
        collections={collections}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSendLink={handleSendLink}
        loading={loading}
        selectedCompanyId={selectedCompany.customerId}
        selectedCompanyName={selectedCompany.companyName}
      />

      <AddDocumentCollectionDialog
        open={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditingCollection(null);
          setPreselectedCustomerId(undefined);
          setPreselectedCompanyName(undefined);
        }}
        onSuccess={handleDialogSuccess}
        editCollection={editingCollection}
        preselectedCustomerId={preselectedCustomerId}
        preselectedCompanyName={preselectedCompanyName}
      />
    </div>
  );
};

export default DocumentCollectionTab;
