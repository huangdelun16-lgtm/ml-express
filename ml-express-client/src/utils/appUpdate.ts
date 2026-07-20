/** Android APK 发布清单解析（纯函数，便于单测） */

export type AndroidReleaseInfo = {
  version: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes: string;
};

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

export function parseAndroidRelease(raw: unknown): AndroidReleaseInfo | null {
  const value = parseJsonValue(raw);
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const version = String(row.version ?? '').trim();
  const versionCode = Number(row.versionCode ?? row.version_code ?? 0);
  const apkUrl = String(row.apkUrl ?? row.apk_url ?? row.downloadUrl ?? row.download_url ?? '').trim();
  const releaseNotes = String(row.releaseNotes ?? row.release_notes ?? row.notes ?? '').trim();
  if (!version || !Number.isFinite(versionCode) || versionCode <= 0 || !apkUrl) return null;
  return { version, versionCode: Math.floor(versionCode), apkUrl, releaseNotes };
}

export function isAndroidUpdateAvailable(currentVersionCode: number, latestVersionCode: number): boolean {
  return latestVersionCode > currentVersionCode;
}
