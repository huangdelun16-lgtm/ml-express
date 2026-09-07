import {
  INVENTORY_ANDROID_RELEASE_FIELDS,
  buildAndroidReleaseSettingsValue,
  fieldsFromAndroidRelease,
  isInventoryAndroidReleaseField,
  parseAndroidReleaseSettings,
  validateAndroidReleaseSettings,
} from './androidReleaseSettings';

describe('androidReleaseSettings', () => {
  it('parses the Inventory App manifest object', () => {
    expect(
      parseAndroidReleaseSettings({
        version: '2.1.2',
        versionCode: 37,
        apkUrl: 'https://example.com/inventory.apk',
        releaseNotes: '到站签收',
      }),
    ).toEqual({
      version: '2.1.2',
      versionCode: 37,
      apkUrl: 'https://example.com/inventory.apk',
      releaseNotes: '到站签收',
    });
  });

  it('accepts snake_case aliases and JSON strings', () => {
    expect(
      parseAndroidReleaseSettings(
        JSON.stringify({
          version: '2.1.0',
          version_code: 36,
          download_url: 'https://example.com/old.apk',
        }),
      ),
    ).toMatchObject({
      version: '2.1.0',
      versionCode: 36,
      apkUrl: 'https://example.com/old.apk',
    });
  });

  it('unwraps { value } wrappers used by other settings', () => {
    expect(
      parseAndroidReleaseSettings({
        value: { version: '2.0.0', versionCode: 30, apkUrl: 'https://cdn.example/a.apk' },
      }),
    ).toMatchObject({ version: '2.0.0', versionCode: 30 });
  });

  it('rejects incomplete payloads', () => {
    expect(parseAndroidReleaseSettings(null)).toBeNull();
    expect(parseAndroidReleaseSettings({ version: '2.1.2' })).toBeNull();
  });

  it('maps parsed release onto virtual form fields and back', () => {
    const fields = fieldsFromAndroidRelease({
      version: '2.1.2',
      versionCode: 37,
      apkUrl: 'https://example.com/inventory.apk',
      releaseNotes: 'note',
    });
    expect(fields[INVENTORY_ANDROID_RELEASE_FIELDS.version]).toBe('2.1.2');
    expect(fields[INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]).toBe(37);
    expect(buildAndroidReleaseSettingsValue(fields)).toEqual({
      version: '2.1.2',
      versionCode: 37,
      apkUrl: 'https://example.com/inventory.apk',
      releaseNotes: 'note',
    });
  });

  it('requires https APK URL and a positive integer versionCode', () => {
    const base = {
      [INVENTORY_ANDROID_RELEASE_FIELDS.version]: '2.1.2',
      [INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]: 37,
      [INVENTORY_ANDROID_RELEASE_FIELDS.apkUrl]: 'https://example.com/a.apk',
      [INVENTORY_ANDROID_RELEASE_FIELDS.releaseNotes]: '',
    };
    expect(validateAndroidReleaseSettings(base)).toBeNull();
    expect(
      validateAndroidReleaseSettings({
        ...base,
        [INVENTORY_ANDROID_RELEASE_FIELDS.apkUrl]: 'http://example.com/a.apk',
      }),
    ).toMatch(/https/);
    expect(
      validateAndroidReleaseSettings({
        ...base,
        [INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]: 0,
      }),
    ).toMatch(/versionCode/);
    expect(
      validateAndroidReleaseSettings({
        ...base,
        [INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]: 37.5,
      }),
    ).toMatch(/versionCode/);
  });

  it('identifies virtual form fields so they are not written as separate rows', () => {
    expect(isInventoryAndroidReleaseField(INVENTORY_ANDROID_RELEASE_FIELDS.apkUrl)).toBe(true);
    expect(isInventoryAndroidReleaseField('inventory.android.latest_release')).toBe(false);
  });
});
