import {
  resolveBrowserSupabaseUrl,
  rewritePublicStorageUrl,
  publicStorageUrl,
  SUPABASE_BROWSER_PROXY_URL,
  SUPABASE_UPSTREAM_HOST,
  MERCHANT_PUBLIC_SB_PROXY,
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

  it('rewrites supabase.co storage onto the merchant /__sb proxy in local jsdom', () => {
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/product_images/x.jpg',
      ),
    ).toBe(`${MERCHANT_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/x.jpg`);
  });

  it('rewrites customer /__sb storage onto the current origin in production', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: 'mlexpress-merchants.com',
        host: 'mlexpress-merchants.com',
        origin: 'https://mlexpress-merchants.com',
        href: 'https://mlexpress-merchants.com/products',
        protocol: 'https:',
      },
    });
    expect(
      rewritePublicStorageUrl(
        'https://market-link-express.com/__sb/storage/v1/object/public/product_images/x.jpg',
      ),
    ).toBe('https://mlexpress-merchants.com/__sb/storage/v1/object/public/product_images/x.jpg');
  });

  it('publicStorageUrl keeps blob previews and maps relative storage paths', () => {
    expect(publicStorageUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(publicStorageUrl('file:///tmp/x.jpg')).toBeUndefined();
    expect(publicStorageUrl('store-1/cover.jpg')).toBe(
      `${MERCHANT_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/store-1/cover.jpg`,
    );
  });
});
