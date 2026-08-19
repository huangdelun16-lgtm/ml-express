import { describe, expect, it } from 'vitest';
import {
  NATIVE_SB_PROXY_URL,
  applyRealtimeWsFallback,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
  rewritePublicStorageUrl,
} from './nativeSupabaseUrl';

const UPSTREAM = 'https://' + 'uopkyuluxnrewvlmutam' + '.supabase.co';
const PROXY_HOST = 'market-link-express.com';

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

  it('realtime fallback is a no-op and does not write workers.dev', () => {
    const originalWs = UPSTREAM + '/realtime/v1/websocket';
    const originalHttp = UPSTREAM + '/realtime/v1';
    const client = {
      realtime: {
        endPoint: originalWs,
        httpEndpoint: originalHttp,
        headers: {},
        socketAdapter: { socket: { endPoint: originalWs } },
      },
    };
    applyRealtimeWsFallback(client, true);
    expect(client.realtime.endPoint).toBe(originalWs);
    applyRealtimeWsFallback(client, false);
    expect(JSON.stringify(client)).not.toContain('workers.dev');
    expect(client.realtime.endPoint).toBe(originalWs);
    expect(client.realtime.httpEndpoint).toBe(originalHttp);
    expect(client.realtime.headers['User-Agent']).toBeUndefined();
    expect(client.realtime.socketAdapter.socket.endPoint).toBe(originalWs);
  });
});

describe('rewritePublicStorageUrl', () => {
  it('rewrites supabase.co storage URLs onto the native /__sb proxy', () => {
    expect(
      rewritePublicStorageUrl(
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/product_images/x.jpg',
      ),
    ).toBe('https://market-link-express.com/__sb/storage/v1/object/public/product_images/x.jpg');
  });
});
