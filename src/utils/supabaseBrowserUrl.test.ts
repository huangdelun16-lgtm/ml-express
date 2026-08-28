import {
  ADMIN_PUBLIC_SB_PROXY,
  applyNetlifyRealtimeFallback,
  isBrowserRealtimeAvailable,
  resolveBrowserSupabaseUrl,
  rewritePublicStorageUrl,
  SUPABASE_BROWSER_PROXY_URL,
  SUPABASE_UPSTREAM_HOST,
} from './supabaseBrowserUrl';

const UPSTREAM = 'https://' + SUPABASE_UPSTREAM_HOST;

describe('resolveBrowserSupabaseUrl', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('localhost / jsdom keeps supabase.co and custom URLs', () => {
    expect(window.location.hostname === 'localhost' || window.location.hostname === '').toBe(true);
    expect(resolveBrowserSupabaseUrl(UPSTREAM)).toBe(UPSTREAM);
    expect(resolveBrowserSupabaseUrl(SUPABASE_BROWSER_PROXY_URL)).toBe(SUPABASE_BROWSER_PROXY_URL);
    expect(resolveBrowserSupabaseUrl('https://sb.example.com')).toBe('https://sb.example.com');
  });

  it('empty falls back to upstream supabase.co (jsdom / local)', () => {
    expect(resolveBrowserSupabaseUrl('')).toBe(UPSTREAM);
    expect(resolveBrowserSupabaseUrl(undefined)).toBe(UPSTREAM);
  });

  it('mocked production admin host returns same-origin /__sb', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: 'admin-market-link-express.com',
        host: 'admin-market-link-express.com',
        origin: 'https://admin-market-link-express.com',
        href: 'https://admin-market-link-express.com/dashboard',
        protocol: 'https:',
      },
    });
    expect(resolveBrowserSupabaseUrl(UPSTREAM)).toBe('https://admin-market-link-express.com/__sb/');
    expect(resolveBrowserSupabaseUrl('')).toBe('https://admin-market-link-express.com/__sb/');
    expect(resolveBrowserSupabaseUrl(SUPABASE_BROWSER_PROXY_URL)).toBe(
      'https://admin-market-link-express.com/__sb/',
    );
    expect(new URL('rest/v1', resolveBrowserSupabaseUrl(UPSTREAM)).href).toBe(
      'https://admin-market-link-express.com/__sb/rest/v1',
    );
    expect(isBrowserRealtimeAvailable()).toBe(false);

    const realtime = { connect: jest.fn(), disconnect: jest.fn() };
    applyNetlifyRealtimeFallback({ realtime } as never);
    expect(realtime.disconnect).toHaveBeenCalled();
    expect(realtime.connect()).toBeUndefined();
  });

  it('localhost keeps Realtime available and does not stub the client', () => {
    expect(isBrowserRealtimeAvailable()).toBe(true);
    const realtime = { connect: jest.fn(), disconnect: jest.fn() };
    applyNetlifyRealtimeFallback({ realtime } as never);
    expect(realtime.disconnect).not.toHaveBeenCalled();
    expect(realtime.connect).not.toHaveBeenCalled();
  });
});

describe('rewritePublicStorageUrl', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('rewrites supabase.co storage onto the admin /__sb proxy in local jsdom', () => {
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/banners/app-banners/x.jpg',
      ),
    ).toBe(`${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/banners/app-banners/x.jpg`);
  });

  it('keeps blob and empty URLs unchanged', () => {
    expect(rewritePublicStorageUrl('')).toBe('');
    expect(rewritePublicStorageUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(rewritePublicStorageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('rewrites customer /__sb storage onto the current origin in production', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: 'admin-market-link-express.com',
        host: 'admin-market-link-express.com',
        origin: 'https://admin-market-link-express.com',
        href: 'https://admin-market-link-express.com/admin/accounts',
        protocol: 'https:',
      },
    });
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/banners/app-banners/x.jpg',
      ),
    ).toBe(
      'https://admin-market-link-express.com/__sb/storage/v1/object/public/banners/app-banners/x.jpg',
    );
    expect(
      rewritePublicStorageUrl(
        'https://mlexpress-merchants.com/__sb/storage/v1/object/public/product_images/x.jpg',
      ),
    ).toBe('https://admin-market-link-express.com/__sb/storage/v1/object/public/product_images/x.jpg');
  });
});
