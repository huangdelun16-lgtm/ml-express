import { createClient } from '@supabase/supabase-js';

// 读取环境变量（在 Netlify 上配置）：
// SUPABASE_URL, SUPABASE_ANON_KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

export function isBackendReady(): boolean {
  return !!supabase;
}

// 简单的内存缓存
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 60秒缓存，增加缓存时间

// 预加载队列
const preloadQueue = new Set<string>();
let preloadTimer: any = null;

export async function fetchWithRetry(input: RequestInfo, init?: RequestInit, retries = 1, timeoutMs = 5000): Promise<Response> {
  // 仅对 GET 请求进行缓存
  const isGet = !init?.method || init.method === 'GET';
  const cacheKey = typeof input === 'string' ? input : input.url;
  
  if (isGet && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      // 返回缓存的响应
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(input, { credentials: 'include', ...(init || {}), signal: controller.signal });
      clearTimeout(timer);
      
      // 缓存成功的 GET 响应
      if (resp.ok && isGet) {
        const clone = resp.clone();
        try {
          const data = await clone.json();
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
        } catch {}
      }
      
      if (resp.ok) return resp;
      if (attempt === retries) return resp;
    } catch (e) {
      clearTimeout(timer);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw new Error('fetchWithRetry unreachable');
}

// 清除缓存的辅助函数
export function clearApiCache() {
  apiCache.clear();
}

// 预加载API数据
export function preloadApi(url: string, headers?: any) {
  preloadQueue.add(url);
  
  // 批量处理预加载请求
  if (preloadTimer) clearTimeout(preloadTimer);
  preloadTimer = setTimeout(() => {
    preloadQueue.forEach(async (url) => {
      // 如果缓存中已有数据，跳过
      if (apiCache.has(url)) {
        const cached = apiCache.get(url)!;
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return;
        }
      }
      
      // 在后台静默加载
      try {
        await fetchWithRetry(url, { headers });
      } catch {}
    });
    preloadQueue.clear();
  }, 100); // 100ms 防抖
}


