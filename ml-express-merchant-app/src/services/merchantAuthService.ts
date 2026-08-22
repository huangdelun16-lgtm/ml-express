import Constants from 'expo-constants';

export type MerchantStoreSession = {
  id: string;
  store_code: string;
  store_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
  store_type?: string | null;
  created_at?: string | null;
  region?: string | null;
};

type MerchantPasswordResult = {
  success?: boolean;
  store?: MerchantStoreSession;
  error?: string;
};

const extra = Constants.expoConfig?.extra as { netlifyUrl?: string } | undefined;

function uniqUrls(urls: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = String(raw || '').trim().replace(/\/$/, '');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

// 缅甸 TLS 会重置 *.netlify.app，优先走已解析的自定义域名。
const NETLIFY_CANDIDATES = uniqUrls([
  'https://mlexpress-merchants.com',
  extra?.netlifyUrl,
  process.env.EXPO_PUBLIC_NETLIFY_URL,
  'https://admin-market-link-express.com',
  'https://admin-market-link-express.netlify.app',
]);

function isCredentialError(message: string): boolean {
  return /密码|店铺代码不存在|不存在|停用|状态异常|中转站|Inventory/i.test(message);
}

export class MerchantAuthError extends Error {
  kind: 'network' | 'credentials';

  constructor(message: string, kind: 'network' | 'credentials') {
    super(message);
    this.kind = kind;
  }
}

async function postMerchantPassword(
  payload: Record<string, unknown>,
): Promise<MerchantPasswordResult> {
  let lastNetworkError = '';

  for (const baseUrl of NETLIFY_CANDIDATES) {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutMs = attempt === 1 ? 15000 : 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${cleanBaseUrl}/.netlify/functions/merchant-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        let result: MerchantPasswordResult | null = null;
        try {
          result = text ? (JSON.parse(text) as MerchantPasswordResult) : null;
        } catch {
          lastNetworkError = `登录服务返回非 JSON (${response.status})`;
          if (response.status === 404 || text.trim().startsWith('<')) break;
          continue;
        }
        if (response.ok && result?.success) {
          return result;
        }

        const errMsg = result?.error || `登录服务返回 ${response.status}`;
        if (response.status === 401 || response.status === 400 || isCredentialError(errMsg)) {
          throw new MerchantAuthError(errMsg, 'credentials');
        }
        lastNetworkError = errMsg;
        if (response.status === 404) break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err instanceof MerchantAuthError) throw err;
        if (err?.name === 'AbortError') {
          lastNetworkError = '登录服务器超时';
        } else {
          lastNetworkError = err?.message || '无法连接登录服务器';
        }
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  throw new MerchantAuthError(
    lastNetworkError || '无法连接登录服务器，请检查网络后重试。',
    'network',
  );
}

export const merchantAuthService = {
  async login(storeCode: string, password: string): Promise<MerchantStoreSession> {
    const result = await postMerchantPassword({
      action: 'login',
      storeCode,
      password,
    });
    if (!result.store?.id) {
      throw new MerchantAuthError('登录失败', 'credentials');
    }
    return result.store;
  },

  async updatePassword(storeId: string, currentPassword: string, newPassword: string): Promise<void> {
    await postMerchantPassword({
      action: 'updatePassword',
      storeId,
      currentPassword,
      newPassword,
    });
  },
};
