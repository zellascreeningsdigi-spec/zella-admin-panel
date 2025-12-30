import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Report } from '@/types/report';
import { RefreshCw, Building2, FileText, Upload, CheckCircle, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CompaniesTable from './CompaniesTable';
import CustomersFilters, { CustomerFilters } from '../Customers/CustomersFilters';
import SendReportDialog from './SendReportDialog';
import ReportDetailsView from './ReportDetailsView';
import ReportsListTable from './ReportsListTable';

const ReportsTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSendReportOpen, setIsSendReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<'companies' | 'reports'>('companies');

  const isCustomer = user?.role === 'customer';

  const fetchCustomers = async (filterParams?: CustomerFilters) => {
    try {
      if (initialLoad) {
        setLoading(true);
      }
      setError(null);

      const response = await apiService.getCustomers({
        limit: 100,
        search: filterParams?.search || undefined,
        dateFrom: filterParams?.dateFrom || undefined,
        dateTo: filterParams?.dateTo || undefined,
        lastReportSentFrom: filterParams?.lastReportSentFrom || undefined,
        lastReportSentTo: filterParams?.lastReportSentTo || undefined,
      });

      if (response.success && response.data) {
        setCustomers(response.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  const fetchReports = async () => {
    try {
      if (initialLoad) {
        setLoading(true);
      }
      setError(null);

      const response = await apiService.getReports({
        limit: 100,
        customerId: isCustomer ? user?.customerId : undefined,
      });

      if (response) {
        setReports(response.reports || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    if (isCustomer) {
      // Customer users only see reports
      setViewMode('reports');
      fetchReports();
    } else {
      // Admin users see companies by default
      fetchCustomers();
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    if (viewMode === 'companies') {
      fetchCustomers();
    } else {
      fetchReports();
    }
  };

  const handleFilterChange = (newFilters: CustomerFilters) => {
    fetchCustomers(newFilters);
  };

  const handleResetFilters = () => {
    fetchCustomers();
  };

  const handleSendReport = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSendReportOpen(true);
  };

  const handleCloseSendReport = () => {
    setIsSendReportOpen(false);
    setSelectedCustomer(null);
    // Refresh reports after sending
    fetchReports();
  };

  const handleShowDetails = (customer: Customer) => {
    navigate('/dashboard', {
      state: {
        activeTab: 'company-details',
        customerId: customer._id
      }
    });
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handleBackFromReport = () => {
    setSelectedReport(null);
    fetchReports();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading companies...</span>
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

  // If viewing a specific report, show the detail view
  if (selectedReport) {
    return (
      <ReportDetailsView
        report={selectedReport}
        onBack={handleBackFromReport}
        onUpdate={fetchReports}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            {viewMode === 'companies'
              ? `Send reports to companies (${customers.length} total companies)`
              : `View reports (${reports.length} total reports)`}
          </p>
        </div>
        <div className="flex space-x-3">
          {!isCustomer && (
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('companies')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'companies'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Send Reports
              </button>
              <button
                onClick={() => setViewMode('reports')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'reports'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                View Reports
              </button>
            </div>
          )}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {viewMode === 'companies' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Email Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {customers.reduce((sum, customer) => sum + customer.emails.length, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Emails per Company</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {customers.length > 0
                    ? (customers.reduce((sum, customer) => sum + customer.emails.length, 0) / customers.length).toFixed(1)
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-gray-700" />
                <CardTitle>All Companies</CardTitle>
              </div>
              <CardDescription>
                View all companies and their information. Click on a company to send report requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomersFilters
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                useReportSentFilter={true}
              />
              <CompaniesTable
                customers={customers}
                onSendReport={handleSendReport}
                onShowDetails={handleShowDetails}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-purple-600 mr-2" />
                  <div className="text-2xl font-bold">{reports.length}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600 mr-2" />
                  <div className="text-2xl font-bold">
                    {reports.filter(r => r.status === 'pending').length}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Upload className="h-8 w-8 text-blue-600 mr-2" />
                  <div className="text-2xl font-bold">
                    {reports.filter(r => r.status === 'in-progress').length}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-2" />
                  <div className="text-2xl font-bold">
                    {reports.filter(r => r.status === 'submitted' || r.status === 'reviewed').length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-700" />
                <CardTitle>{isCustomer ? 'My Report Requests' : 'All Report Requests'}</CardTitle>
              </div>
              <CardDescription>
                {isCustomer
                  ? 'View and submit your report requests'
                  : 'Track all report requests and their submission status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsListTable
                reports={reports}
                onViewReport={handleViewReport}
                onDeleteReport={!isCustomer ? (reportId) => {
                  if (window.confirm('Delete this report request?')) {
                    apiService.deleteReport(reportId).then(() => fetchReports());
                  }
                } : undefined}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Send Report Dialog */}
      <SendReportDialog
        isOpen={isSendReportOpen}
        onClose={handleCloseSendReport}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default ReportsTab;
