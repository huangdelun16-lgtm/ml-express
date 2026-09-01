import {
  publicStorageUrl,
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

  it('empty string falls back to upstream supabase.co (jsdom / local)', () => {
    expect(resolveBrowserSupabaseUrl('')).toBe(UPSTREAM);
  });

  it('undefined uses REACT_APP_SUPABASE_URL when the env is set', () => {
    const envUrl = String(process.env.REACT_APP_SUPABASE_URL || '').trim().replace(/\/$/, '');
    expect(resolveBrowserSupabaseUrl(undefined)).toBe(envUrl || UPSTREAM);
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

describe('publicStorageUrl', () => {
  it('rewrites supabase.co product images onto the public /__sb proxy', () => {
    expect(
      publicStorageUrl(
        `${UPSTREAM}/storage/v1/object/public/product_images/a.jpg`,
      ),
    ).toBe('https://market-link-express.com/__sb/storage/v1/object/public/product_images/a.jpg');
  });

  it('builds a proxy URL from a storage object path', () => {
    expect(publicStorageUrl('84e7/a.jpg')).toBe(
      'https://market-link-express.com/__sb/storage/v1/object/public/product_images/84e7/a.jpg',
    );
  });

  it('leaves blob and data URLs untouched', () => {
    expect(publicStorageUrl('blob:https://market-link-express.com/1')).toBe(
      'blob:https://market-link-express.com/1',
    );
    expect(rewritePublicStorageUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
  });
});
