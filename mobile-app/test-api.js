// 测试API连接
import { authService } from './services/api';

// 测试API连接
export async function testApiConnection() {
  try {
    console.log('🧪 开始测试API连接...');
    
    // 测试基础连接
    const response = await fetch('https://market-link-express.com/.netlify/functions/packages-manage', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-ml-actor': 'mobile-app',
        'x-ml-role': 'mobile-client',
      }
    });

    console.log('📡 API响应状态:', response.status);
    const data = await response.json();
    console.log('📡 API响应数据:', data);

    if (response.ok) {
      console.log('✅ API连接成功！');
      return {
        success: true,
        message: 'API连接正常',
        data: data
      };
    } else {
      console.log('❌ API连接失败:', data);
      return {
        success: false,
        message: data.message || 'API连接失败',
        data: data
      };
    }
  } catch (error) {
    console.error('❌ 网络连接失败:', error);
    return {
      success: false,
      message: '网络连接失败: ' + error.message
    };
  }
}

// 测试用户验证
export async function testUserExists(username) {
  try {
    console.log('🔍 测试用户是否存在:', username);
    
    const response = await fetch('https://market-link-express.com/.netlify/functions/users-manage', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-ml-actor': username, // 使用用户名作为actor
        'x-ml-role': 'user',
      }
    });

    console.log('👤 用户查询响应状态:', response.status);
    const data = await response.json();
    console.log('👤 用户查询响应数据:', data);

    return {
      success: response.ok,
      data: data,
      status: response.status
    };
  } catch (error) {
    console.error('❌ 用户查询失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
