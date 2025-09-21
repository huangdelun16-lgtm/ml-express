import * as SecureStore from 'expo-secure-store';

// 配置API基础URL - 指向您的网站
const BASE_URL = 'https://market-link-express.com/.netlify/functions';

interface ApiResponse<T = any> {
  data: T;
  status: number;
  success: boolean;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('userToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();
      
      return {
        data,
        status: response.status,
        success: response.ok,
        message: data.message || data.error
      };
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, {
      method: 'GET',
    });
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
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(BASE_URL);

// 具体的API服务
export const authService = {
  login: (username: string, password: string) =>
    apiClient.post('/users-manage', { action: 'login', username, password }),
  
  register: (userData: any) =>
    apiClient.post('/users-manage', { action: 'register', ...userData }),
};

export const orderService = {
  createOrder: (orderData: any) =>
    apiClient.post('/packages-manage', orderData),
  
  getOrders: (params?: Record<string, string>) =>
    apiClient.get('/packages-manage', params),
  
  updateOrder: (orderId: string, data: any) =>
    apiClient.put(`/packages-manage?id=${orderId}`, data),
};

export const riderService = {
  getOrders: (riderId: string) =>
    apiClient.get('/packages-manage', { assignedRider: riderId }),
  
  updateStatus: (riderId: string, status: string) =>
    apiClient.put('/riders-manage', { id: riderId, status }),
  
  updateLocation: (riderId: string, location: any) =>
    apiClient.post('/rider-location', { riderId, ...location }),
  
  completeOrder: (orderId: string, riderId: string) =>
    apiClient.put(`/packages-manage?id=${orderId}`, { 
      status: '已签收',
      completedBy: riderId,
      completedAt: new Date().toISOString()
    }),
};

export const financeService = {
  getFinanceRecords: (params?: Record<string, string>) =>
    apiClient.get('/finances-manage', params),
  
  updateFinanceStatus: (recordId: string, status: string) =>
    apiClient.put(`/finances-manage?id=${recordId}`, { status }),
};

export const adminService = {
  getUsers: (params?: Record<string, string>) =>
    apiClient.get('/users-manage', params),
  
  createUser: (userData: any) =>
    apiClient.post('/users-manage', userData),
  
  updateUser: (userId: string, data: any) =>
    apiClient.put(`/users-manage?id=${userId}`, data),
  
  deleteUser: (userId: string) =>
    apiClient.delete(`/users-manage?id=${userId}`),
};
