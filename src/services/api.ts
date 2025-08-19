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
      userEmail: 'maheshwariharsh38@gmail.com',
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
}

export const apiService = new ApiService();
export default apiService;