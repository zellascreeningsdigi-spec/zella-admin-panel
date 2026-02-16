const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface VerificationSubmitData {
  // Contact Information
  contactPersonName: string;
  contactPersonRelation: string;
  numberOfFamilyMembers?: number;
  contactPhoneNo?: string;

  // ID Proof
  idProofType: 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license' | 'other';
  idProofNumber?: string;

  // Address Details
  periodOfStay?: string;
  differentAddress?: string;
  residentialStatus: 'owned' | 'rented' | 'company_provided' | 'pg' | 'other';
  landmark?: string;
  remarks?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;

  // Legacy fields
  addressConfirmed?: boolean;
  correctedAddress?: string;
  candidateComments?: string;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle unauthorized responses
        if (response.status === 401) {
          // Clear stored authentication data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');

          // Redirect to login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          throw new Error('Authentication required');
        }

        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Cases API methods
  async getCases(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<{
    cases: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = queryParams.toString() ? `/cases?${queryParams}` : '/cases';
    return this.get(endpoint);
  }

  async getCaseStats(): Promise<ApiResponse<{
    stats: {
      totalCases: number;
      pendingCases: number;
      completedCases: number;
      insufficiencyCases: number;
      digiLockerInitiated: number;
      digiLockerCompleted: number;
    };
  }>> {
    return this.get('/cases/stats/overview');
  }

  async getCaseById(caseId: string): Promise<ApiResponse<{
    case: any;
  }>> {
    return this.get(`/cases/${caseId}`);
  }

  async createCase(caseData: any): Promise<ApiResponse<{
    case: any;
  }>> {
    return this.post('/cases', caseData);
  }

  async updateCase(caseId: string, caseData: any): Promise<ApiResponse<{
    case: any;
  }>> {
    return this.put(`/cases/${caseId}`, caseData);
  }

  async deleteCase(caseId: string): Promise<ApiResponse<{
    case: any;
  }>> {
    return this.delete(`/cases/${caseId}`);
  }

  async bulkCreateCases(cases: any[]): Promise<ApiResponse<{
    created: number;
    failed: number;
    errors?: any[];
  }>> {
    return this.post('/cases/bulk', { cases });
  }

  // DigiLocker specific methods
  async initiateDigiLocker(caseData: any): Promise<ApiResponse<{
    sessionId: string;
    authUrl: string;
    verificationLink: string;
    notificationStatus: {
      emailSent: boolean;
      smsSent: boolean;
    };
  }>> {
    return this.post('/digilocker/initiate', {
      caseId: caseData.id,
      caseData: {
        name: caseData.name,
        phone: caseData.phone,
        email: caseData.email || '',
        companyName: caseData.companyName,
        code: caseData.code
      },
      redirectUrl: `${window.location.origin}/digilocker/callback`
    });
  }

  async getDigiLockerSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.get(`/digilocker/session/${sessionId}`);
  }

  async sendDigiLockerAuthEmail(caseData: any): Promise<ApiResponse<{
    sessionId: string;
    authUrl: string;
    emailSent: boolean;
  }>> {
    return this.post('/digilocker/send-auth-email', {
      userEmail: caseData.email,
      // userEmail: 'maheshwariharsh38@gmail.com',
      caseData: {
        name: caseData.name,
        initiatorName: caseData.initiatorName,
        phone: caseData.phone,
        email: caseData.email || '',
        companyName: caseData.companyName,
        code: caseData.code,
        caseId: caseData.id,
        address: caseData.address,
        city: caseData.city,
        state: caseData.state,
        pin: caseData.pin
      }
    });
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{
    token: string;
    user: any;
  }>> {
    return this.post('/auth/login', { email, password });
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.post('/auth/logout');
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: any }>> {
    return this.get('/auth/me');
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.post('/auth/refresh');
  }

  async resetPassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.post('/auth/reset-password', { currentPassword, newPassword });
  }

  async updateProfile(name: string, designation: string, phone?: string): Promise<ApiResponse<{ user: any }>> {
    return this.put('/auth/profile', { name, designation, phone });
  }

  // Customers API methods
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    lastUpdatedFrom?: string;
    lastUpdatedTo?: string;
    lastReportSentFrom?: string;
    lastReportSentTo?: string;
  }): Promise<ApiResponse<{
    customers: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.lastUpdatedFrom) queryParams.append('lastUpdatedFrom', params.lastUpdatedFrom);
    if (params?.lastUpdatedTo) queryParams.append('lastUpdatedTo', params.lastUpdatedTo);
    if (params?.lastReportSentFrom) queryParams.append('lastReportSentFrom', params.lastReportSentFrom);
    if (params?.lastReportSentTo) queryParams.append('lastReportSentTo', params.lastReportSentTo);

    const endpoint = queryParams.toString() ? `/customers?${queryParams}` : '/customers';
    return this.get(endpoint);
  }

  async getCustomerById(customerId: string): Promise<ApiResponse<{
    customer: any;
  }>> {
    return this.get(`/customers/${customerId}`);
  }

  async createCustomer(customerData: any): Promise<ApiResponse<{
    customer: any;
  }>> {
    return this.post('/customers', customerData);
  }

  async updateCustomer(customerId: string, customerData: any): Promise<ApiResponse<{
    customer: any;
  }>> {
    return this.put(`/customers/${customerId}`, customerData);
  }

  async deleteCustomer(customerId: string): Promise<ApiResponse<{
    customer: any;
  }>> {
    return this.delete(`/customers/${customerId}`);
  }

  // Customer Documents API
  async getCustomerDocuments(customerId: string): Promise<ApiResponse<{
    documents: any[];
    documentsRequired: string[];
  }>> {
    return this.get(`/customers/${customerId}/documents`);
  }

  async uploadCustomerDocument(customerId: string, formData: FormData): Promise<ApiResponse<{
    document: any;
  }>> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    return response.json();
  }

  async deleteCustomerDocument(customerId: string, documentId: string): Promise<ApiResponse<{}>> {
    return this.delete(`/customers/${customerId}/documents/${documentId}`);
  }

  // Document Requirements API
  async addDocumentRequirement(customerId: string, documentName: string): Promise<ApiResponse<{
    documentsRequired: string[];
  }>> {
    return this.post(`/customers/${customerId}/document-requirements`, { documentName });
  }

  async renameDocumentRequirement(customerId: string, index: number, newName: string): Promise<ApiResponse<{
    documentsRequired: string[];
  }>> {
    return this.put(`/customers/${customerId}/document-requirements/${index}`, { newName });
  }

  async deleteDocumentRequirement(customerId: string, index: number): Promise<ApiResponse<{
    documentsRequired: string[];
  }>> {
    return this.delete(`/customers/${customerId}/document-requirements/${index}`);
  }

  async downloadAllDocuments(customerId: string): Promise<void> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}/documents/download-all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download documents');
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'documents.zip';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Download the blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async sendCustomerLoginEmails(customerId: string, emails: string[]): Promise<ApiResponse<{
    results: any[];
    successCount: number;
    failureCount: number;
  }>> {
    return this.post(`/customers/${customerId}/send-email`, { emails });
  }

  async sendCompanyReport(
    customerId: string,
    emails: string[],
    subject: string,
    message: string,
    excelFile: File,
    additionalFiles: File[]
  ): Promise<ApiResponse<{
    results: any[];
    successCount: number;
    failureCount: number;
  }>> {
    const formData = new FormData();
    formData.append('emails', JSON.stringify(emails));
    formData.append('subject', subject);
    formData.append('message', message);
    formData.append('report', excelFile);

    // Append all additional files
    additionalFiles.forEach((file) => {
      formData.append('additionalFiles', file);
    });

    const token = this.getAuthToken();
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/customers/${customerId}/send-report`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Authentication required');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async getCustomerEmailReports(customerId: string): Promise<ApiResponse<{
    emailReports: any[];
    total: number;
  }>> {
    return this.get(`/customers/${customerId}/email-reports`);
  }

  async deleteCustomerEmailReport(customerId: string, reportId: string): Promise<ApiResponse<{}>> {
    return this.delete(`/customers/${customerId}/email-reports/${reportId}`);
  }

  // User Management API methods (ashish@zellascreenings.com only)
  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<ApiResponse<{
    users: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUsers: number;
      limit: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);

    const endpoint = queryParams.toString() ? `/users/all?${queryParams}` : '/users/all';
    return this.get(endpoint);
  }

  async getAdminUsers(): Promise<ApiResponse<{
    users: any[];
  }>> {
    return this.get('/users/admins');
  }

  async createAdminUser(userData: {
    name: string;
    designation?: string;
    phone?: string;
    email: string;
    password: string;
    role: 'admin' | 'super-admin';
  }): Promise<ApiResponse<{
    user: any;
  }>> {
    return this.post('/users/admins', userData);
  }

  async updateAdminUser(
    userId: string,
    updates: {
      name?: string;
      designation?: string;
      phone?: string;
      email?: string;
      password?: string;
      role?: 'admin' | 'super-admin';
      isActive?: boolean;
    }
  ): Promise<ApiResponse<{
    user: any;
  }>> {
    return this.put(`/users/admins/${userId}`, updates);
  }

  async deleteAdminUser(userId: string): Promise<ApiResponse<{}>> {
    return this.delete(`/users/admins/${userId}`);
  }

  // Reports API methods
  async getReports(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    reports: any[];
    currentPage: number;
    totalPages: number;
    totalReports: number;
  }> {
    const queryString = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString();

    // Backend returns this structure directly, not wrapped in ApiResponse
    return this.get(`/reports${queryString ? `?${queryString}` : ''}`) as any;
  }

  async getReportById(reportId: string): Promise<any> {
    // Backend returns report directly, not wrapped in ApiResponse
    return this.get(`/reports/${reportId}`) as any;
  }

  async createReport(reportData: {
    reportType: string;
    description: string;
    customerId: string;
    emails: string[];
    dueDate?: string;
    priority?: string;
  }): Promise<ApiResponse<any>> {
    return this.post('/reports', reportData);
  }

  async uploadReportDocument(reportId: string, formData: FormData): Promise<any> {
    const token = this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    // Backend returns report directly
    return data;
  }

  async deleteReportDocument(reportId: string, documentId: string): Promise<ApiResponse<{}>> {
    return this.delete(`/reports/${reportId}/documents/${documentId}`);
  }

  async submitReport(reportId: string): Promise<any> {
    // Backend returns report directly
    return this.post(`/reports/${reportId}/submit`) as any;
  }

  async deleteReport(reportId: string): Promise<ApiResponse<{}>> {
    return this.delete(`/reports/${reportId}`);
  }

  async updateReportStatus(reportId: string, status: string, reviewNotes?: string): Promise<ApiResponse<any>> {
    return this.patch(`/reports/${reportId}/status`, { status, reviewNotes });
  }

  private async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Address Verification API methods
  async getAddressVerifications(params?: {
    page?: number;
    limit?: number;
    status?: string;
    verificationStatus?: string;
    search?: string;
  }): Promise<ApiResponse<{
    verifications: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.verificationStatus) queryParams.append('verificationStatus', params.verificationStatus);
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return this.get(`/address-verifications${queryString ? `?${queryString}` : ''}`);
  }

  async getAddressVerificationStats(): Promise<ApiResponse<{
    stats: {
      total: number;
      pending: number;
      verified: number;
      failed: number;
      linkSent: number;
      expired: number;
      successRate: number;
    };
  }>> {
    return this.get('/address-verifications/stats');
  }

  async getAddressVerificationById(id: string): Promise<ApiResponse<any>> {
    return this.get(`/address-verifications/${id}`);
  }

  async createAddressVerification(data: any): Promise<ApiResponse<any>> {
    return this.post('/address-verifications', data);
  }

  async updateAddressVerification(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/address-verifications/${id}`, data);
  }

  async deleteAddressVerification(id: string): Promise<ApiResponse<{}>> {
    return this.delete(`/address-verifications/${id}`);
  }

  async bulkCreateAddressVerifications(verifications: any[]): Promise<ApiResponse<{
    created: number;
    failed: number;
    errors?: any[];
  }>> {
    return this.post('/address-verifications/bulk', { verifications });
  }

  async sendVerificationLink(id: string): Promise<ApiResponse<{
    verificationToken: string;
    verificationLink: string;
    emailSent: boolean;
    expiresAt: string;
  }>> {
    return this.post(`/address-verifications/${id}/send-link`);
  }

  // Generate report (HTML view in new tab)
  async viewAddressVerificationReport(id: string): Promise<void> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}/address-verifications/${id}/report?format=html`;

    // Fetch the HTML report and open in new window
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate report' }));
        console.error('Report generation error:', errorData);
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const html = await response.text();

      // Open in new window with HTML content
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('View report error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate report'}`);
      throw error;
    }
  }

  // Get report as HTML string
  async getAddressVerificationReportHTML(id: string): Promise<string> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}/address-verifications/${id}/report?format=html`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load report' }));
        throw new Error(errorData.message || 'Failed to load report');
      }

      const html = await response.text();
      return html;
    } catch (error) {
      console.error('Get report HTML error:', error);
      throw error;
    }
  }

  // Download report as PDF
  async downloadAddressVerificationReport(id: string, code: string): Promise<void> {
    const token = this.getAuthToken();
    const url = `${API_BASE_URL}/address-verifications/${id}/report?format=pdf`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to download report' }));
        throw new Error(errorData.message || 'Failed to download report');
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        const text = await response.text();
        console.error('Expected PDF but got:', contentType, text.substring(0, 200));
        throw new Error('Invalid response format: Expected PDF but received ' + contentType);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Address_Verification_Report_${code}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download report error:', error);
      alert(`Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Public verification endpoints (no auth required)
  async getVerificationByToken(token: string): Promise<ApiResponse<any>> {
    return fetch(`${API_BASE_URL}/address-verifications/public/${token}`)
      .then(res => res.json());
  }

  async submitVerification(token: string, data: VerificationSubmitData): Promise<ApiResponse<any>> {
    return fetch(`${API_BASE_URL}/address-verifications/public/${token}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(res => res.json());
  }

  async uploadVerificationDocument(token: string, file: File, docType: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('docType', docType);

    return fetch(`${API_BASE_URL}/address-verifications/public/${token}/upload-document`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  }
}

export const apiService = new ApiService();
export default apiService;