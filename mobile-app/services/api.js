// ML Express Mobile API 服务
// 连接到网站后端 API

const BASE_URL = 'https://market-link-express.com/.netlify/functions';

// API 请求封装
class ApiService {
  constructor() {
    this.baseUrl = BASE_URL;
    this.token = null;
  }

  // 设置认证token
  setToken(token) {
    this.token = token;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-ml-actor': 'mobile-app', // 网站需要的特殊header
        'x-ml-role': 'mobile-client', // 标识移动端客户端
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 API请求: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      const data = await response.json();
      
      console.log(`📡 API响应:`, data);
      
      return {
        success: response.ok,
        data: data,
        status: response.status,
        message: data.message || data.error
      };
    } catch (error) {
      console.error('❌ API请求失败:', error);
      return {
        success: false,
        data: null,
        status: 500,
        message: '网络连接失败'
      };
    }
  }

  // GET 请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  // POST 请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE 请求
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 用户认证服务
export const authService = {
  // 用户登录 - 使用专用的移动端认证API
  async login(username, password) {
    console.log('🔐 尝试登录:', username);
    
    try {
      // 调用专用的移动端认证API
      const response = await apiService.post('/mobile-auth', {
        action: 'login',
        username: username,
        password: password
      });

      console.log('📡 登录API响应:', response);

      if (response.success && response.data) {
        const token = response.data.token;
        apiService.setToken(token);
        
        console.log('✅ 登录成功:', response.data.user);
        
        return {
          success: true,
          user: response.data.user,
          token: token
        };
      } else {
        console.log('❌ 登录失败:', response.message);
        return {
          success: false,
          message: response.message || '登录失败'
        };
      }
    } catch (error) {
      console.error('❌ 登录请求失败:', error);
      return {
        success: false,
        message: '网络连接失败，请检查网络设置'
      };
    }
  },

  // 用户注册
  async register(userData) {
    console.log('📝 用户注册:', userData);
    
    const response = await apiService.post('/users-manage', {
      action: 'register',
      ...userData
    });
    
    return response;
  },

  // 验证token
  async verifyToken(token) {
    apiService.setToken(token);
    
    // 可以调用一个验证接口
    const response = await apiService.get('/users-manage', { action: 'verify' });
    return response.success;
  }
};

// 订单服务
export const orderService = {
  // 创建订单
  async createOrder(orderData) {
    console.log('📦 创建订单:', orderData);
    
    return await apiService.post('/packages-manage', {
      ...orderData,
      createdAt: new Date().toISOString(),
      trackingNumber: `C${Date.now()}${Math.floor(Math.random() * 1000)}`
    });
  },

  // 获取订单列表
  async getOrders(params = {}) {
    console.log('📋 获取订单列表:', params);
    
    return await apiService.get('/packages-manage', params);
  },

  // 更新订单状态
  async updateOrder(orderId, updateData) {
    console.log('🔄 更新订单:', orderId, updateData);
    
    return await apiService.put(`/packages-manage?id=${orderId}`, updateData);
  },

  // 获取订单详情
  async getOrderDetail(orderId) {
    console.log('🔍 获取订单详情:', orderId);
    
    return await apiService.get('/packages-manage', { id: orderId });
  }
};

// 骑手服务
export const riderService = {
  // 获取骑手订单
  async getRiderOrders(riderId) {
    console.log('🚴‍♂️ 获取骑手订单:', riderId);
    
    return await apiService.get('/packages-manage', { 
      assignedRider: riderId 
    });
  },

  // 更新骑手状态
  async updateRiderStatus(riderId, status) {
    console.log('🔄 更新骑手状态:', riderId, status);
    
    const response = await apiService.put('/riders-manage', {
      id: riderId,
      status: status
    });

    // 同步状态到状态同步服务
    if (response.success) {
      try {
        await apiService.put('/status-sync', {
          riderId: riderId,
          status: status,
          source: 'app'
        });
        console.log(`🔄 App端状态同步: ${riderId} -> ${status}`);
      } catch (syncError) {
        console.error('状态同步失败:', syncError);
      }
    }

    return response;
  },

  // 上传位置信息
  async updateLocation(riderId, locationData) {
    console.log('📍 上传位置:', riderId, locationData);
    
    return await apiService.post('/rider-location', {
      riderId: riderId,
      ...locationData
    });
  },

  // 确认取件
  async confirmPickup(orderId, riderId) {
    console.log('📦 确认取件:', orderId);
    
    return await apiService.put(`/packages-manage?id=${orderId}`, {
      status: '运输中',
      assignedRider: riderId,
      pickedUpAt: new Date().toISOString()
    });
  },

  // 确认签收
  async confirmDelivery(orderId, riderId) {
    console.log('✅ 确认签收:', orderId);
    
    return await apiService.put(`/packages-manage?id=${orderId}`, {
      status: '已签收',
      completedBy: riderId,
      completedAt: new Date().toISOString()
    });
  },

  // 新增：任务分配相关方法
  async getPendingAssignments(riderId) {
    console.log('🔔 获取待处理任务分配:', riderId);
    return await apiService.get(`/order-assignment?riderId=${riderId}`);
  },

  async acceptTask(taskId, riderId) {
    console.log('✅ 接受任务:', taskId);
    return await apiService.put('/order-assignment', {
      taskId,
      status: 'accepted',
      riderId
    });
  },

  async rejectTask(taskId, riderId) {
    console.log('❌ 拒绝任务:', taskId);
    return await apiService.put('/order-assignment', {
      taskId,
      status: 'rejected',
      riderId
    });
  },

  async completeAssignment(taskId, riderId) {
    console.log('🎉 完成任务分配:', taskId);
    return await apiService.put('/order-assignment', {
      taskId,
      status: 'completed',
      riderId
    });
  }
};

// 财务服务
export const financeService = {
  // 获取财务记录
  async getFinanceRecords(params = {}) {
    console.log('💰 获取财务记录:', params);
    
    return await apiService.get('/finances-manage', params);
  },

  // 更新财务状态
  async updateFinanceStatus(recordId, status) {
    console.log('💳 更新财务状态:', recordId, status);
    
    return await apiService.put(`/finances-manage?id=${recordId}`, {
      status: status
    });
  }
};

// 管理服务
export const adminService = {
  // 获取用户列表
  async getUsers(params = {}) {
    console.log('👥 获取用户列表:', params);
    
    return await apiService.get('/users-manage', params);
  },

  // 创建用户
  async createUser(userData) {
    console.log('👤 创建用户:', userData);
    
    return await apiService.post('/users-manage', userData);
  },

  // 更新用户
  async updateUser(userId, userData) {
    console.log('🔄 更新用户:', userId, userData);
    
    return await apiService.put(`/users-manage?id=${userId}`, userData);
  },

  // 获取统计数据
  async getStats() {
    console.log('📊 获取统计数据');
    
    // 可以并发请求多个接口获取统计
    const [ordersResponse, financeResponse, ridersResponse] = await Promise.all([
      apiService.get('/packages-manage', { pageSize: '1' }),
      apiService.get('/finances-manage', { pageSize: '1' }),
      apiService.get('/riders-manage')
    ]);

    return {
      success: true,
      data: {
        totalOrders: ordersResponse.data?.total || 0,
        totalRevenue: financeResponse.data?.total || 0,
        totalRiders: ridersResponse.data?.length || 0
      }
    };
  }
};

// 位置服务
export const locationService = {
  // 获取所有骑手位置
  async getAllRiderLocations() {
    console.log('🗺️ 获取所有骑手位置');
    
    return await apiService.get('/rider-location');
  },

  // 获取单个骑手位置
  async getRiderLocation(riderId) {
    console.log('📍 获取骑手位置:', riderId);
    
    return await apiService.get('/rider-location', { riderId });
  }
};

export default apiService;
