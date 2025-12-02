/**
 * XSS 防护工具
 * 提供安全的 HTML 清理和文本转义功能
 */

/**
 * 转义 HTML 特殊字符
 * 防止 XSS 攻击
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * 清理 HTML 内容（基础版本）
 * 移除所有脚本标签和危险属性
 * 
 * ⚠️ 注意：这是基础实现，生产环境建议使用 DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // 移除 script 标签及其内容
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除 on* 事件处理器
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // 移除 javascript: 协议
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // 移除 data: URL（可能包含恶意代码）
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized;
}

/**
 * 安全的文本内容设置
 * 使用 textContent 而不是 innerHTML
 */
export function setTextContent(element: HTMLElement | null, text: string): void {
  if (!element) return;
  element.textContent = text;
}

/**
 * 安全的 HTML 内容设置（需要清理）
 * 仅在确实需要 HTML 时使用，并确保内容已清理
 */
export function setSafeHtml(element: HTMLElement | null, html: string): void {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

/**
 * React 中的安全 HTML 渲染
 * 返回可以安全使用的对象
 */
export function createSafeHtml(html: string): { __html: string } {
  return {
    __html: sanitizeHtml(html),
  };
}

/**
 * 检查字符串是否包含潜在的 XSS 攻击
 */
export function containsXssAttempt(text: string): boolean {
  if (!text) return false;
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(text));
}

/**
 * 验证用户输入是否安全
 */
export function validateUserInput(input: string): { safe: boolean; sanitized: string } {
  const containsXss = containsXssAttempt(input);
  const sanitized = containsXss ? sanitizeHtml(input) : input;
  
  return {
    safe: !containsXss,
    sanitized,
  };
}

