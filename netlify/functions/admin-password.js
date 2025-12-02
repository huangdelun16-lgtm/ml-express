/**
 * 管理员密码加密和验证 Netlify Function
 * 使用 bcrypt 加密密码，确保密码安全存储
 */

const bcrypt = require('bcryptjs');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码哈希
 */
async function hashPassword(password) {
  try {
    // 使用 bcrypt 加密，salt rounds = 10（平衡安全性和性能）
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('密码加密失败:', error);
    throw new Error('密码加密失败');
  }
}

/**
 * 验证密码
 * @param {string} password - 用户输入的明文密码
 * @param {string} hashedPassword - 数据库中存储的加密密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
async function verifyPassword(password, hashedPassword) {
  try {
    // 如果密码是明文（旧数据），先检查是否直接匹配（向后兼容）
    if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$') && !hashedPassword.startsWith('$2y$')) {
      // 这是明文密码，直接比较（仅用于迁移期间）
      return password === hashedPassword;
    }
    
    // 使用 bcrypt 验证加密密码
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('密码验证失败:', error);
    return false;
  }
}

/**
 * 验证用户登录（包含密码验证）
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, account?: object, error?: string}>}
 */
async function verifyLogin(username, password) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Supabase 配置缺失' };
    }

    // 从 Supabase 获取用户信息
    const response = await fetch(`${supabaseUrl}/rest/v1/admin_accounts?username=eq.${encodeURIComponent(username)}&status=eq.active&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const accounts = await response.json();
    
    if (!accounts || accounts.length === 0) {
      return { success: false, error: '用户名不存在或账号已被停用' };
    }

    const account = accounts[0];
    
    // 验证密码
    const passwordValid = await verifyPassword(password, account.password);
    
    if (!passwordValid) {
      return { success: false, error: '密码错误' };
    }

    // 如果密码是明文，自动加密并更新（迁移）
    if (!account.password.startsWith('$2a$') && !account.password.startsWith('$2b$') && !account.password.startsWith('$2y$')) {
      const hashedPassword = await hashPassword(password);
      
      // 更新数据库中的密码为加密版本
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/admin_accounts?id=eq.${account.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ password: hashedPassword })
      });

      if (!updateResponse.ok) {
        console.warn('密码加密更新失败，但登录成功');
      }
    }

    // 返回账户信息（不包含密码）
    const { password: _, ...accountWithoutPassword } = account;
    return {
      success: true,
      account: accountWithoutPassword
    };
  } catch (error) {
    console.error('登录验证失败:', error);
    return { success: false, error: '登录验证过程出错' };
  }
}

// 引入 CORS 工具函数
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

/**
 * Netlify Function 主处理函数
 */
exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  if (preflightResponse) {
    return preflightResponse;
  }

  // 获取 CORS 响应头
  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // 只接受 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '方法不允许' })
    };
  }

  try {
    const { action, username, password, plainPassword } = JSON.parse(event.body || '{}');

    if (action === 'hash') {
      // 加密密码
      if (!plainPassword) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少密码参数' })
        };
      }
      const hashedPassword = await hashPassword(plainPassword);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ hashedPassword })
      };
    } else if (action === 'verify') {
      // 验证密码
      if (!password || !plainPassword) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少密码参数' })
        };
      }
      const isValid = await verifyPassword(plainPassword, password);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: isValid })
      };
    } else if (action === 'login') {
      // 验证登录
      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少用户名或密码' })
        };
      }
      const result = await verifyLogin(username, password);
      return {
        statusCode: result.success ? 200 : 401,
        headers,
        body: JSON.stringify(result)
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
      body: JSON.stringify({ error: '服务器内部错误', details: error.message })
    };
  }
};

// 导出辅助函数供其他 Functions 使用
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.verifyLogin = verifyLogin;

