/**
 * 验证管理员权限的 Netlify Function
 * 用于保护所有后台 API 请求
 * 使用 HMAC-SHA256 签名确保 Token 安全
 */

const crypto = require('crypto');

// 注意：Netlify Functions 需要 @supabase/supabase-js 在根目录的 package.json 中
// 如果函数无法找到模块，请确保已安装依赖
let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient;
} catch (e) {
  // 如果无法加载，使用 fetch 直接调用 Supabase REST API
  console.warn('无法加载 @supabase/supabase-js，将使用 REST API');
}

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// 初始化 Supabase 客户端（如果可用）
let supabaseClient = null;
if (supabase && supabaseUrl && supabaseKey) {
  supabaseClient = supabase(supabaseUrl, supabaseKey);
}

/**
 * 使用 HMAC-SHA256 生成安全的 Token 签名
 * @param {string} data - 要签名的数据
 * @returns {string} Base64 编码的签名
 */
function generateHMACSignature(data) {
  // 从环境变量获取密钥，如果没有则使用默认值（仅用于开发）
  // 生产环境必须设置 JWT_SECRET（服务端）和 REACT_APP_JWT_SECRET（客户端）
  // 注意：客户端和服务端必须使用相同的密钥！
  const secret = process.env.JWT_SECRET || process.env.REACT_APP_JWT_SECRET || 'default-dev-secret-change-in-production';
  
  if (!secret || secret === 'default-dev-secret-change-in-production') {
    console.warn('⚠️ 警告：使用默认 JWT_SECRET，生产环境不安全！请在 Netlify 环境变量中配置 JWT_SECRET');
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64');
}

/**
 * 验证 HMAC-SHA256 签名
 * @param {string} data - 原始数据
 * @param {string} signature - 要验证的签名（Base64 编码）
 * @returns {boolean} 签名是否有效
 */
function verifyHMACSignature(data, signature) {
  try {
    const expectedSignature = generateHMACSignature(data);
    
    // 如果签名长度不同，直接返回 false
    if (expectedSignature.length !== signature.length) {
      return false;
    }
    
    // 使用时间安全的比较方法（避免时序攻击）
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('签名验证错误:', error);
    return false;
  }
}

/**
 * 验证管理员 Token
 * @param {string} token - JWT Token 或 Session Token
 * @param {string[]} requiredRoles - 需要的角色列表
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
async function verifyAdminToken(token, requiredRoles = []) {
  try {
    if (!token) {
      return { valid: false, error: '缺少认证令牌' };
    }

    // 解析 Token（使用 HMAC-SHA256 签名）
    // Token 格式：username:role:timestamp:signature
    const parts = token.split(':');
    if (parts.length < 4) {
      return { valid: false, error: '无效的令牌格式' };
    }

    const [username, role, timestamp, signature] = parts;
    const payload = `${username}:${role}:${timestamp}`;
    
    // 验证签名
    try {
      const isValidSignature = verifyHMACSignature(payload, signature);
      if (!isValidSignature) {
        return { valid: false, error: '令牌签名无效' };
      }
    } catch (signatureError) {
      console.error('签名验证错误:', signatureError);
      return { valid: false, error: '令牌签名验证失败' };
    }
    
    // 检查 Token 是否过期（2小时）
    const tokenAge = Date.now() - parseInt(timestamp);
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    if (tokenAge > TWO_HOURS || tokenAge < 0) {
      return { valid: false, error: '令牌已过期' };
    }

    // 验证用户是否存在且状态为 active
    let account = null;
    
    if (supabaseClient) {
      // 使用 Supabase 客户端
      const { data, error } = await supabaseClient
        .from('admin_accounts')
        .select('id, username, employee_name, role, status')
        .eq('username', username)
        .eq('role', role)
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        return { valid: false, error: '用户不存在或已被停用' };
      }
      account = data;
    } else {
      // 回退：使用 REST API 直接查询
      const response = await fetch(`${supabaseUrl}/rest/v1/admin_accounts?username=eq.${username}&role=eq.${role}&status=eq.active&select=id,username,employee_name,role,status`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (!data || data.length === 0) {
        return { valid: false, error: '用户不存在或已被停用' };
      }
      account = data[0];
    }

    // 检查角色权限
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      return { valid: false, error: '权限不足' };
    }

    return {
      valid: true,
      user: {
        id: account.id,
        username: account.username,
        name: account.employee_name,
        role: account.role
      }
    };
  } catch (error) {
    console.error('验证令牌失败:', error);
    return { valid: false, error: '验证过程出错' };
  }
}

/**
 * 生成管理员 Token（使用 HMAC-SHA256 签名）
 * @param {string} username - 用户名
 * @param {string} role - 角色
 * @returns {string} Token
 */
function generateAdminToken(username, role) {
  const timestamp = Date.now().toString();
  const payload = `${username}:${role}:${timestamp}`;
  const signature = generateHMACSignature(payload);
  return `${payload}:${signature}`;
}

// 引入 CORS 工具函数
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

/**
 * Netlify Function 主处理函数
 */
exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  if (preflightResponse) {
    return preflightResponse;
  }

  // 获取 CORS 响应头
  const headers = getCorsHeaders(event, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  try {
    const { action, token, requiredRoles } = JSON.parse(event.body || '{}');

    if (action === 'verify') {
      // 验证 Token
      const result = await verifyAdminToken(token, requiredRoles || []);
      return {
        statusCode: result.valid ? 200 : 401,
        headers,
        body: JSON.stringify(result)
      };
    } else if (action === 'generate') {
      // 生成 Token（仅用于登录时）
      const { username, role } = JSON.parse(event.body);
      const newToken = generateAdminToken(username, role);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token: newToken, valid: true })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '无效的操作' })
      };
    }
  } catch (error) {
    console.error('Function 错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器内部错误' })
    };
  }
};

// 导出辅助函数供其他 Functions 使用
exports.verifyAdminToken = verifyAdminToken;
exports.generateAdminToken = generateAdminToken;

