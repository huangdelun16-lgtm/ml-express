import { describe, expect, it } from 'vitest';
import { isAndroidUpdateAvailable, parseAndroidRelease } from './appUpdate';

describe('parseAndroidRelease', () => {
  it('parses release manifest object', () => {
    expect(
      parseAndroidRelease({
        version: '1.9.2',
        versionCode: 25,
        apkUrl: 'https://example.com/ml-inventory.apk',
        releaseNotes: 'Fix hub receive',
      }),
    ).toEqual({
      version: '1.9.2',
      versionCode: 25,
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

  it('compares versionCode for update availability', () => {
    expect(isAndroidUpdateAvailable(12, 13)).toBe(true);
    expect(isAndroidUpdateAvailable(13, 13)).toBe(false);
    expect(isAndroidUpdateAvailable(14, 13)).toBe(false);
  });
});
