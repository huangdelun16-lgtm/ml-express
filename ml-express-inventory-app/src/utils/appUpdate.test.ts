import { describe, expect, it } from 'vitest';
import { isAndroidUpdateAvailable, parseAndroidRelease } from './appUpdate';
import { NATIVE_SB_PROXY_URL } from '../services/nativeSupabaseUrl';

describe('parseAndroidRelease', () => {
  it('parses release manifest object', () => {
    expect(
      parseAndroidRelease({
        version: '1.9.8',
        versionCode: 31,
        apkUrl: 'https://example.com/ml-inventory.apk',
        releaseNotes: 'Fix hub receive',
      }),
    ).toEqual({
      version: '1.9.8',
      versionCode: 31,
      apkUrl: 'https://example.com/ml-inventory.apk',
      releaseNotes: 'Fix hub receive',
    });
  });

  it('parses JSON string payload', () => {
    expect(
      parseAndroidRelease(
        JSON.stringify({
          version: '1.6.0',
          version_code: 12,
          download_url: 'https://example.com/app.apk',
        }),
      ),
    ).toMatchObject({
      version: '1.6.0',
      versionCode: 12,
      apkUrl: 'https://example.com/app.apk',
    });
  });

  it('returns null for invalid payload', () => {
    expect(parseAndroidRelease(null)).toBeNull();
    expect(parseAndroidRelease({ version: '1.0.0' })).toBeNull();
  });

  it('rewrites supabase.co APK URLs onto the native proxy', () => {
    const parsed = parseAndroidRelease({
      version: '1.9.11',
      versionCode: 34,
      apkUrl:
        'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/inventory-releases/ml-inventory.apk',
    });
    expect(parsed?.apkUrl).toBe(
      `${NATIVE_SB_PROXY_URL.replace(/\/$/, '')}/storage/v1/object/public/inventory-releases/ml-inventory.apk`,
    );
  });

  it('compares versionCode for update availability', () => {
    expect(isAndroidUpdateAvailable(12, 13)).toBe(true);
    expect(isAndroidUpdateAvailable(13, 13)).toBe(false);
    expect(isAndroidUpdateAvailable(14, 13)).toBe(false);
  });
});
