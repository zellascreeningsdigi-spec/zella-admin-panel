const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
        appNo: caseData.appNo,
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
        phone: caseData.phone,
        email: caseData.email || '',
        appNo: caseData.appNo,
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

  // Customers API methods
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    lastUpdatedFrom?: string;
    lastUpdatedTo?: string;
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

  async sendCustomerLoginEmails(customerId: string, emails: string[]): Promise<ApiResponse<{
    results: any[];
    successCount: number;
    failureCount: number;
  }>> {
    return this.post(`/customers/${customerId}/send-email`, { emails });
  }
}

export const apiService = new ApiService();
export default apiService;