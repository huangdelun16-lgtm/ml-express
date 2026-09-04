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
