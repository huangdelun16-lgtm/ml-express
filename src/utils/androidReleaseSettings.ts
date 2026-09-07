/** Inventory Android 发布清单（system_settings.inventory.android.latest_release） */

export const INVENTORY_ANDROID_RELEASE_KEY = 'inventory.android.latest_release';
export const INVENTORY_ANDROID_RELEASE_CATEGORY = 'inventory';

export const INVENTORY_ANDROID_RELEASE_FIELDS = {
  version: 'inventory.android.release.version',
  versionCode: 'inventory.android.release.versionCode',
  apkUrl: 'inventory.android.release.apkUrl',
  releaseNotes: 'inventory.android.release.releaseNotes',
} as const;

export type AndroidReleaseSettings = {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes: string;
};

const FIELD_KEYS = new Set<string>(Object.values(INVENTORY_ANDROID_RELEASE_FIELDS));

export function isInventoryAndroidReleaseField(key: string): boolean {
  return FIELD_KEYS.has(key);
}

function parseJsonValue(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return raw;
}

function unwrapSettingsValue(raw: unknown): unknown {
  const value = parseJsonValue(raw);
  if (value && typeof value === 'object' && 'value' in (value as object)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseAndroidReleaseSettings(raw: unknown): AndroidReleaseSettings | null {
  const value = unwrapSettingsValue(raw);
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const version = String(row.version ?? '').trim();
  const versionCode = Number(row.versionCode ?? row.version_code ?? 0);
  const apkUrl = String(
    row.apkUrl ?? row.apk_url ?? row.downloadUrl ?? row.download_url ?? '',
  ).trim();
  const releaseNotes = String(row.releaseNotes ?? row.release_notes ?? row.notes ?? '').trim();
  if (!version || !Number.isFinite(versionCode) || versionCode <= 0 || !apkUrl) {
    return null;
  }
  return {
    version,
    versionCode: Math.floor(versionCode),
    apkUrl,
    releaseNotes,
  };
}

export function fieldsFromAndroidRelease(
  release: AndroidReleaseSettings,
): Record<string, string | number> {
  return {
    [INVENTORY_ANDROID_RELEASE_FIELDS.version]: release.version,
    [INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]: release.versionCode,
    [INVENTORY_ANDROID_RELEASE_FIELDS.apkUrl]: release.apkUrl,
    [INVENTORY_ANDROID_RELEASE_FIELDS.releaseNotes]: release.releaseNotes,
  };
}

export function readAndroidReleaseFields(
  values: Record<string, unknown>,
): { version: string; versionCode: number; apkUrl: string; releaseNotes: string } {
  const version = String(values[INVENTORY_ANDROID_RELEASE_FIELDS.version] ?? '').trim();
  const versionCode = Number(values[INVENTORY_ANDROID_RELEASE_FIELDS.versionCode]);
  const apkUrl = String(values[INVENTORY_ANDROID_RELEASE_FIELDS.apkUrl] ?? '').trim();
  const releaseNotes = String(values[INVENTORY_ANDROID_RELEASE_FIELDS.releaseNotes] ?? '').trim();
  return { version, versionCode, apkUrl, releaseNotes };
}

export function validateAndroidReleaseSettings(
  values: Record<string, unknown>,
): string | null {
  const { version, versionCode, apkUrl } = readAndroidReleaseFields(values);
  if (!version) return '请填写 Inventory 版本号，例如 2.1.2。';
  if (!Number.isFinite(versionCode) || versionCode < 1 || !Number.isInteger(versionCode)) {
    return 'versionCode 必须是大于 0 的整数。';
  }
  if (!isHttpsUrl(apkUrl)) return '请填写 https 开头的 APK 下载地址。';
  return null;
}

export function buildAndroidReleaseSettingsValue(
  values: Record<string, unknown>,
): AndroidReleaseSettings | null {
  if (validateAndroidReleaseSettings(values)) return null;
  const { version, versionCode, apkUrl, releaseNotes } = readAndroidReleaseFields(values);
  return {
    version,
    versionCode: Math.floor(versionCode),
    apkUrl,
    releaseNotes,
  };
}
