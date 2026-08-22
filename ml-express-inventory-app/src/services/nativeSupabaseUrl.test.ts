import { describe, expect, it } from 'vitest';
import {
  NATIVE_SB_PROXY_URL,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
  rewritePublicStorageUrl,
} from './nativeSupabaseUrl';

const UPSTREAM = 'https://' + 'uopkyuluxnrewvlmutam' + '.supabase.co';
const PROXY_HOST = 'admin-market-link-express.com';

describe('resolveNativeSupabaseUrl', () => {
  it('dev remaps supabase.co to /__sb (Myanmar cannot reach origin)', () => {
    expect(resolveNativeSupabaseUrl(UPSTREAM, true)).toBe(NATIVE_SB_PROXY_URL);
    expect(resolveNativeSupabaseUrl('https://sb.example.com', true)).toBe('https://sb.example.com');
  });

  it('allowDirect keeps supabase.co in local VPN debugging', () => {
    expect(resolveNativeSupabaseUrl(UPSTREAM, true, { allowDirect: true })).toBe(UPSTREAM);
  });

  it('dev keeps trailing slash when env already points at /__sb', () => {
    expect(resolveNativeSupabaseUrl('https://admin-market-link-express.com/__sb/', true)).toBe(
      'https://admin-market-link-express.com/__sb/',
    );
  });

  it('Expo Go always uses /__sb even if env is supabase.co', () => {
    expect(resolveNativeSupabaseUrl(UPSTREAM, true, { expoGo: true })).toBe(NATIVE_SB_PROXY_URL);
    expect(new URL('rest/v1', resolveNativeSupabaseUrl(UPSTREAM, true, { expoGo: true })).href).toBe(
      'https://' + PROXY_HOST + '/__sb/rest/v1',
    );
    expect(resolveNativeSupabaseUrl(UPSTREAM, true, { expoGo: true, allowDirect: true })).toBe(
      NATIVE_SB_PROXY_URL,
    );
  });

  it('release remaps any configured URL to absolute /__sb/ with trailing slash', () => {
    expect(resolveNativeSupabaseUrl(UPSTREAM, false)).toBe(NATIVE_SB_PROXY_URL);
    expect(resolveNativeSupabaseUrl('', false)).toBe(NATIVE_SB_PROXY_URL);
    expect(resolveNativeSupabaseUrl(NATIVE_SB_PROXY_URL, false)).toBe(NATIVE_SB_PROXY_URL);
    expect(resolveNativeSupabaseUrl(UPSTREAM, false).endsWith('/')).toBe(true);
    expect(NATIVE_SB_PROXY_URL.endsWith('/__sb/')).toBe(true);
  });

  it('production base keeps /__sb when supabase-js joins rest/v1', () => {
    const href = new URL('rest/v1', resolveNativeSupabaseUrl(UPSTREAM, false)).href;
    expect(href).toBe('https://' + PROXY_HOST + '/__sb/rest/v1');
  });

  it('does not attach a global User-Agent on REST', () => {
    expect(nativeClientHeaders(false)).toBeUndefined();
    expect(nativeClientHeaders(true)).toBeUndefined();
  });

});

describe('rewritePublicStorageUrl', () => {
  it('rewrites supabase.co storage onto /__sb', () => {
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/inventory-releases/app.apk',
      ),
    ).toBe(
      'https://admin-market-link-express.com/__sb/storage/v1/object/public/inventory-releases/app.apk',
    );
  });

  it('leaves local and empty URLs alone', () => {
    expect(rewritePublicStorageUrl('')).toBe('');
    expect(rewritePublicStorageUrl('file:///tmp/a.apk')).toBe('file:///tmp/a.apk');
    expect(rewritePublicStorageUrl('https://example.com/app.apk')).toBe(
      'https://example.com/app.apk',
    );
  });
});
