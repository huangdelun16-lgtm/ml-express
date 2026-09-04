import {
  ADMIN_PUBLIC_SB_PROXY,
  applyNetlifyRealtimeFallback,
  isBrowserRealtimeAvailable,
  publicStorageUrl,
  resolveBrowserSupabaseUrl,
  rewritePublicStorageUrl,
  SUPABASE_BROWSER_PROXY_URL,
  SUPABASE_UPSTREAM_HOST,
  withPublicProductImages,
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

  it('localhost / jsdom uses same-origin /__sb for supabase and Worker URLs', () => {
    const localSb = `${window.location.origin}/__sb/`;
    expect(window.location.hostname === 'localhost' || window.location.hostname === '').toBe(true);
    expect(resolveBrowserSupabaseUrl(UPSTREAM)).toBe(localSb);
    expect(resolveBrowserSupabaseUrl(SUPABASE_BROWSER_PROXY_URL)).toBe(localSb);
    expect(resolveBrowserSupabaseUrl('https://sb.example.com')).toBe('https://sb.example.com');
  });

  it('empty also uses same-origin /__sb so localhost does not dial supabase.co', () => {
    const localSb = `${window.location.origin}/__sb/`;
    expect(resolveBrowserSupabaseUrl('')).toBe(localSb);
    expect(resolveBrowserSupabaseUrl(undefined)).toBe(localSb);
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

  it('localhost /__sb disables Realtime so the browser does not dial supabase.co WS', () => {
    expect(isBrowserRealtimeAvailable()).toBe(false);
    const realtime = { connect: jest.fn(), disconnect: jest.fn() };
    applyNetlifyRealtimeFallback({ realtime } as never);
    expect(realtime.disconnect).toHaveBeenCalled();
    expect(realtime.connect()).toBeUndefined();
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

  it('rewrites merchant license storage onto the admin /__sb proxy in local jsdom', () => {
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/merchant-application-docs/applications/1788415991618_iqm4vo5.jpg',
      ),
    ).toBe(
      `${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/merchant-application-docs/applications/1788415991618_iqm4vo5.jpg`,
    );
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

describe('publicStorageUrl', () => {
  it('rewrites supabase.co product images onto the admin /__sb proxy', () => {
    expect(
      publicStorageUrl(
        `${UPSTREAM}/storage/v1/object/public/product_images/84e7/a.jpg`,
      ),
    ).toBe(`${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/84e7/a.jpg`);
  });

  it('builds a proxy URL from a storage object path', () => {
    expect(publicStorageUrl('84e7/a.jpg')).toBe(
      `${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/84e7/a.jpg`,
    );
  });

  it('leaves blob and empty URLs untouched', () => {
    expect(publicStorageUrl('')).toBe('');
    expect(publicStorageUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1');
    expect(publicStorageUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
  });
});

describe('withPublicProductImages', () => {
  it('rewrites cover, detail, and pending-edit image urls', () => {
    const mapped = withPublicProductImages({
      image_url: `${UPSTREAM}/storage/v1/object/public/product_images/a.jpg`,
      detail_image_urls: [`${UPSTREAM}/storage/v1/object/public/product_images/b.jpg`],
      pending_update: {
        image_url: `${UPSTREAM}/storage/v1/object/public/product_images/c.jpg`,
      },
    });
    expect(mapped.image_url).toBe(`${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/a.jpg`);
    expect(mapped.detail_image_urls).toEqual([
      `${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/b.jpg`,
    ]);
    expect(mapped.pending_update?.image_url).toBe(
      `${ADMIN_PUBLIC_SB_PROXY}/storage/v1/object/public/product_images/c.jpg`,
    );
  });
});
