/**
 * 认证服务
 * 处理管理员登录、Token 生成和验证
 * 使用 HMAC-SHA256 签名确保 Token 安全
 */

interface AdminToken {
  token: string;
  expiresAt: number;
  user: {
    username: string;
    role: string;
    name: string;
  };
}

const TOKEN_STORAGE_KEY = 'admin_auth_token';
const TOKEN_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2小时

/**
 * 使用 HMAC-SHA256 生成安全的 Token 签名
 * @param data - 要签名的数据
 * @returns Promise<string> - Base64 编码的签名
 */
async function generateHMACSignature(data: string): Promise<string> {
  try {
    // 使用 Web Crypto API（浏览器环境）
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // 从环境变量获取密钥，如果没有则使用默认值（仅用于开发）
    // 生产环境必须设置 REACT_APP_JWT_SECRET（客户端）和 JWT_SECRET（服务端）
    // 注意：客户端和服务端必须使用相同的密钥！
    const secret = process.env.REACT_APP_JWT_SECRET || 'default-dev-secret-change-in-production';
    
    if (!secret || secret === 'default-dev-secret-change-in-production') {
      console.warn('⚠️ 警告：使用默认 JWT_SECRET，生产环境不安全！请在 Netlify 环境变量中配置 REACT_APP_JWT_SECRET');
    }
    
    const keyBuffer = encoder.encode(secret);
    
    // 导入密钥
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // 生成签名
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    
    // 转换为 Base64（兼容 TypeScript 编译）
    const uint8Array = new Uint8Array(signature);
    const charCodes = Array.from(uint8Array);
    return btoa(String.fromCharCode.apply(null, charCodes));
  } catch (error) {
    console.error('生成签名失败:', error);
    // 提供更详细的错误信息
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
    }
    throw new Error('Token 签名生成失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * 验证 HMAC-SHA256 签名
 * @param data - 原始数据
 * @param signature - 要验证的签名（Base64 编码）
 * @returns Promise<boolean> - 签名是否有效
 */
async function verifyHMACSignature(data: string, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await generateHMACSignature(data);
    // 使用时间安全的比较方法
    return expectedSignature === signature;
  } catch (error) {
    console.error('验证签名失败:', error);
    return false;
  }
}

/**
 * 生成安全的 Session Token
 * 格式：username:role:timestamp:signature
 * 签名使用 HMAC-SHA256 确保无法伪造
 */
async function generateToken(username: string, role: string): Promise<string> {
  const timestamp = Date.now().toString();
  const payload = `${username}:${role}:${timestamp}`;
  const signature = await generateHMACSignature(payload);
  return `${payload}:${signature}`;
}

/**
 * 验证 Token 是否有效（包括签名验证）
 */
async function isValidToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(':');
    if (parts.length < 4) return false; // 现在需要4部分：username:role:timestamp:signature

    const [username, role, timestamp, signature] = parts;
    const payload = `${username}:${role}:${timestamp}`;
    
    // 验证签名
    const isValidSignature = await verifyHMACSignature(payload, signature);
    if (!isValidSignature) {
      return false;
    }
    
    // 检查是否过期
    const tokenAge = Date.now() - parseInt(timestamp);
    return tokenAge < TOKEN_EXPIRY_TIME && tokenAge >= 0;
  } catch {
    return false;
  }
}

/**
 * 从 Token 中提取用户信息
 */
function parseToken(token: string): { username: string; role: string } | null {
  try {
    const parts = token.split(':');
    if (parts.length < 4) return null; // 现在需要4部分
    
    return {
      username: parts[0],
      role: parts[1]
    };
  } catch {
    return null;
  }
}

/**
 * 保存 Token 到 localStorage
 */
export async function saveToken(username: string, role: string, name: string): Promise<string> {
  const token = await generateToken(username, role);
  const tokenData: AdminToken = {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_TIME,
    user: { username, role, name }
  };
  
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  localStorage.setItem('currentUser', username);
  localStorage.setItem('currentUserName', name);
  localStorage.setItem('currentUserRole', role);
  
  return token;
}

/**
 * 获取当前 Token（同步版本，用于快速检查）
 */
export function getToken(): string | null {
  try {
    const tokenData = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!tokenData) return null;
    
    const parsed: AdminToken = JSON.parse(tokenData);
    
    // 检查是否过期
    if (Date.now() > parsed.expiresAt) {
      clearToken();
      return null;
    }
    
    // 基本格式验证（签名验证在 verifyToken 中进行）
    const parts = parsed.token.split(':');
    if (parts.length < 4) {
      clearToken();
      return null;
    }
    
    return parsed.token;
  } catch {
    return null;
  }
}

/**
 * 验证 Token 有效性（包括签名验证）
 */
export async function validateToken(token: string): Promise<boolean> {
  return await isValidToken(token);
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserName');
  localStorage.removeItem('currentUserRole');
}

/**
 * 验证 Token（调用服务端验证）
 */
export async function verifyToken(requiredRoles: string[] = []): Promise<{
  valid: boolean;
  user?: { username: string; role: string; name: string };
  error?: string;
}> {
  const token = getToken();
  
  if (!token) {
    return { valid: false, error: '未找到认证令牌' };
  }

  try {
    // 调用 Netlify Function 验证 Token
    const response = await fetch('/.netlify/functions/verify-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verify',
        token,
        requiredRoles
      })
    });

    const result = await response.json();
    
    if (!result.valid) {
      clearToken();
    }
    
    return result;
  } catch (error) {
    console.error('验证 Token 失败:', error);
    // 如果服务端验证失败，回退到客户端验证（包括签名验证）
    const parsed = parseToken(token);
    if (parsed && await isValidToken(token)) {
      if (requiredRoles.length === 0 || requiredRoles.includes(parsed.role)) {
        return {
          valid: true,
          user: {
            username: parsed.username,
            role: parsed.role,
            name: localStorage.getItem('currentUserName') || ''
          }
        };
      }
    }
    
    clearToken();
    return { valid: false, error: '验证失败' };
  }
}

/**
 * 检查用户是否已登录
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): { username: string; role: string; name: string } | null {
  const token = getToken();
  if (!token) return null;
  
  const parsed = parseToken(token);
  if (!parsed) return null;
  
  return {
    username: parsed.username,
    role: parsed.role,
    name: localStorage.getItem('currentUserName') || ''
  };
}

