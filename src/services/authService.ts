/**
 * 认证服务
 * 处理管理员登录、Token 生成和验证
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
 * 生成简单的 Session Token
 * 格式：username:role:timestamp:signature
 */
function generateToken(username: string, role: string): string {
  const timestamp = Date.now().toString();
  // 简单签名（生产环境应使用更安全的签名方法）
  const signature = btoa(`${username}:${role}:${timestamp}`).slice(0, 16);
  return `${username}:${role}:${timestamp}:${signature}`;
}

/**
 * 验证 Token 是否有效
 */
function isValidToken(token: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length < 3) return false;

    const timestamp = parseInt(parts[2]);
    const age = Date.now() - timestamp;
    
    // 检查是否过期
    return age < TOKEN_EXPIRY_TIME;
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
    if (parts.length < 3) return null;
    
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
export function saveToken(username: string, role: string, name: string): string {
  const token = generateToken(username, role);
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
 * 获取当前 Token
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
    
    // 验证 Token 格式
    if (!isValidToken(parsed.token)) {
      clearToken();
      return null;
    }
    
    return parsed.token;
  } catch {
    return null;
  }
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
    // 如果服务端验证失败，回退到客户端验证
    const parsed = parseToken(token);
    if (parsed && isValidToken(token)) {
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

