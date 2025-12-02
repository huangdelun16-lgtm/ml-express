/**
 * Cookie 辅助工具
 * 注意：httpOnly Cookie 只能由服务器设置，客户端无法直接读取
 * 此工具用于处理非敏感数据的 Cookie（如用户偏好设置）
 */

/**
 * 设置 Cookie（仅用于非敏感数据）
 * 敏感数据（如 Token）应该由服务器通过 httpOnly Cookie 设置
 */
export function setCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict${window.location.protocol === 'https:' ? ';Secure' : ''}`;
}

/**
 * 获取 Cookie（仅用于非敏感数据）
 */
export function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * 删除 Cookie
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * 检查是否支持 Cookie
 */
export function cookiesEnabled(): boolean {
  try {
    setCookie('__test_cookie__', '1', 1);
    const enabled = getCookie('__test_cookie__') === '1';
    deleteCookie('__test_cookie__');
    return enabled;
  } catch {
    return false;
  }
}

