import { describe, expect, it } from 'vitest';
import {
  NATIVE_SB_PROXY_URL,
  applyRealtimeWsFallback,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
} from './nativeSupabaseUrl';

const UPSTREAM = 'https://' + 'uopkyuluxnrewvlmutam' + '.supabase.co';
const PROXY_HOST = 'admin-market-link-express.com';

describe('resolveNativeSupabaseUrl', () => {
  it('dev keeps env supabase.co and custom URLs', () => {
    expect(resolveNativeSupabaseUrl(UPSTREAM, true)).toBe(UPSTREAM);
    expect(resolveNativeSupabaseUrl('https://sb.example.com', true)).toBe('https://sb.example.com');
  });

  it('dev empty stays empty (caller uses placeholder)', () => {
    expect(resolveNativeSupabaseUrl('', true)).toBe('');
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

  it('realtime fallback only when not dev', () => {
    const client = {
      realtime: {
        endPoint: UPSTREAM + '/realtime/v1/websocket',
        httpEndpoint: UPSTREAM + '/realtime/v1',
        headers: {},
      },
    };
    applyRealtimeWsFallback(client, true);
    expect(client.realtime.endPoint).toContain('supabase.co');
    applyRealtimeWsFallback(client, false);
    expect(client.realtime.endPoint.startsWith('wss://')).toBe(true);
    expect(client.realtime.httpEndpoint).toContain('/realtime/v1');
    expect(client.realtime.headers['User-Agent']).toContain('Mozilla');
  });
});
