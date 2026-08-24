import {
  applyNetlifyRealtimeFallback,
  isBrowserRealtimeAvailable,
  resolveBrowserSupabaseUrl,
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
