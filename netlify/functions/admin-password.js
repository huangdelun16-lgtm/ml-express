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
 * @returns {Promise<{valid: boolean, needsMigration: boolean, error?: string}>} 验证结果
 */
async function verifyPassword(password, hashedPassword) {
  try {
    // 检查密码格式是否为加密格式
    const isHashed = hashedPassword && (
      hashedPassword.startsWith('$2a$') || 
      hashedPassword.startsWith('$2b$') || 
      hashedPassword.startsWith('$2y$')
    );
    
    // 如果密码是明文，拒绝验证并要求迁移
    if (!isHashed) {
      return {
        valid: false,
        needsMigration: true,
        error: '密码格式已过期，请重置密码'
      };
    }
    
    // 使用 bcrypt 验证加密密码
    const isValid = await bcrypt.compare(password, hashedPassword);
    return {
      valid: isValid,
      needsMigration: false
    };
  } catch (error) {
    console.error('密码验证失败:', error);
    return {
      valid: false,
      needsMigration: false,
      error: '密码验证过程出错'
    };
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
    
    // 检查密码格式
    const isPasswordHashed = account.password && (
      account.password.startsWith('$2a$') || 
      account.password.startsWith('$2b$') || 
      account.password.startsWith('$2y$')
    );
    
    // 如果密码是明文，拒绝登录并要求重置密码
    if (!isPasswordHashed) {
      return { 
        success: false, 
        error: '密码格式已过期，请联系管理员重置密码',
        requiresPasswordReset: true
      };
    }
    
    // 验证密码
    const passwordResult = await verifyPassword(password, account.password);
    
    if (!passwordResult.valid) {
      return { 
        success: false, 
        error: passwordResult.error || '密码错误' 
      };
    }

    // 返回账户信息（不包含密码）
    const { password: _, ...accountWithoutPassword } = account;

    // 🚀 新增：登录成功时，自动在数据库中更新最后登录时间
    try {
      await fetch(`${supabaseUrl}/rest/v1/admin_accounts?id=eq.${account.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ last_login: new Date().toISOString() })
      });
      console.log(`✅ 已更新用户 ${username} 的最后登录时间`);
    } catch (updateError) {
      console.warn('⚠️ 更新最后登录时间失败:', updateError.message);
    }

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
      // 检查密码格式
      const isPasswordHashed = password && (
        password.startsWith('$2a$') || 
        password.startsWith('$2b$') || 
        password.startsWith('$2y$')
      );
      
      if (!isPasswordHashed) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            valid: false, 
            error: '密码格式已过期，需要重置密码',
            requiresPasswordReset: true
          })
        };
      }
      
      const passwordResult = await verifyPassword(plainPassword, password);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: passwordResult.valid,
          needsMigration: passwordResult.needsMigration,
          error: passwordResult.error
        })
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
      
      // 如果登录成功，设置 httpOnly Cookie
      if (result.success && result.account) {
        // 生成 Token（用于设置 Cookie）
        const { generateAdminToken } = require('./verify-admin');
        const token = generateAdminToken(result.account.username, result.account.role);
        
        // 检测是否为 HTTPS（通过请求头判断）
        const protoHeader = event.headers?.['x-forwarded-proto'] || event.headers?.['X-Forwarded-Proto'];
        const isHttps = (protoHeader && protoHeader.includes('https')) || process.env.NODE_ENV === 'production';

        // 计算 Cookie 域名
        const hostHeader = event.headers?.host || event.headers?.Host || '';
        const requestHost = hostHeader.split(':')[0];
        const cookieDomain = process.env.COOKIE_DOMAIN || requestHost || 'admin-market-link-express.com';
        
        // 设置 httpOnly Cookie（2小时过期）
        const cookieMaxAge = 2 * 60 * 60; // 2小时（秒）
        const cookieOptions = [
          `admin_auth_token=${token}`,
          `Max-Age=${cookieMaxAge}`,
          'Path=/',
          `Domain=${cookieDomain}`,
          'HttpOnly', // 防止 JavaScript 访问
          isHttps ? 'Secure' : '',
          // Windows 浏览器在 HTTPS 下也可以使用 Lax，稳定性更好
          'SameSite=Lax'
        ].filter(Boolean).join('; ');
        
        headers['Set-Cookie'] = cookieOptions;
        
        // 调试日志（仅在开发环境）
        if (process.env.NODE_ENV !== 'production') {
          console.log('Cookie 设置:', cookieOptions);
          console.log('Token 生成成功:', token.substring(0, 20) + '...');
          console.log('请求 Host:', hostHeader, 'Proto:', protoHeader);
        }
      }
      
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