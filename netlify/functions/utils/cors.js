/**
 * CORS 处理工具函数
 * 限制允许的来源，提高安全性
 */

/**
 * 获取允许的来源列表
 * 从环境变量读取，如果没有配置则使用默认值
 */
function getAllowedOrigins() {
  // 从环境变量读取允许的来源列表（逗号分隔）
  const envOrigins = process.env.ALLOWED_ORIGINS;
  
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  
  // 默认允许的来源（开发和生产环境）
  return [
    'https://admin-market-link-express.com',      // 后台管理自定义域名
    'https://admin-market-link-express.netlify.app',
    'https://market-link-express.com',            // 主域名
    'https://market-link-express.netlify.app',
    'https://client-ml-express.netlify.app',
    'http://localhost:3000',      // 本地开发（admin）
    'http://localhost:3001',      // 本地开发（client）
    'http://localhost:8888',      // Netlify Dev
  ];
}

/**
 * 验证来源是否被允许
 * @param {string} origin - 请求来源
 * @returns {boolean} 是否允许
 */
function isOriginAllowed(origin) {
  if (!origin) {
    return false;
  }
  
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * 获取 CORS 响应头
 * @param {object} event - Netlify Function 事件对象
 * @param {object} options - 可选配置
 * @param {string[]} options.allowedMethods - 允许的 HTTP 方法
 * @param {string[]} options.allowedHeaders - 允许的请求头
 * @returns {object} CORS 响应头
 */
function getCorsHeaders(event, options = {}) {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization']
  } = options;
  
  // 获取请求来源
  const origin = event.headers?.origin || event.headers?.Origin || '';
  
  // 验证来源
  const isAllowed = isOriginAllowed(origin);
  
  // 如果来源被允许，返回该来源；否则返回 null（不允许）
  const allowOrigin = isAllowed ? origin : null;
  
  // 如果没有允许的来源，返回默认头（不允许跨域）
  if (!allowOrigin) {
    return {
      'Content-Type': 'application/json'
    };
  }
  
  // 返回完整的 CORS 头
  // 注意：如果使用 Cookie，必须设置 Access-Control-Allow-Credentials: true
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Allow-Credentials': 'true', // 允许发送 Cookie
    'Content-Type': 'application/json'
  };
}

/**
 * 处理 CORS 预检请求（OPTIONS）
 * @param {object} event - Netlify Function 事件对象
 * @param {object} options - 可选配置
 * @returns {object|null} 如果是预检请求，返回响应；否则返回 null
 */
function handleCorsPreflight(event, options = {}) {
  if (event.httpMethod === 'OPTIONS') {
    const headers = getCorsHeaders(event, options);
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  return null;
}

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  getCorsHeaders,
  handleCorsPreflight
};

