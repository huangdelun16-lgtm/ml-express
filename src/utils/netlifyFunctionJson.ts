export const LOCAL_FUNCTIONS_MISSING =
  '本地没有登录接口。请停掉当前服务后重新 npm start（会代理线上 Functions），或改用 npx netlify dev。';

export function parseNetlifyFunctionJson<T>(text: string, response: Pick<Response, 'status' | 'headers'>): T {
  const trimmed = String(text || '').trim();
  const contentType = response.headers?.get?.('content-type') || '';
  if (!trimmed) {
    throw new Error(`登录服务无响应 (${response.status})`);
  }
  if (trimmed.startsWith('<') || contentType.includes('text/html')) {
    throw new Error(LOCAL_FUNCTIONS_MISSING);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`登录服务返回了无效数据 (${response.status})`);
  }
}

export async function readNetlifyFunctionJson<T>(response: Response): Promise<T> {
  return parseNetlifyFunctionJson<T>(await response.text(), response);
}

const RETRY_STATUSES = new Set([502, 503, 504]);

/** 线上函数偶发连接重置时再试，避免登录一次 504 就失败。401 等业务错误不重试。 */
export async function fetchNetlifyWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  attempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRY_STATUSES.has(response.status) || attempt === attempts - 1) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('登录服务无响应');
}
