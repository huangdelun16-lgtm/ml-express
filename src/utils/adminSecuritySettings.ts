/** 系统设置「安全与合规」在后台前端消费的纯函数（闲置退出）。 */

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 45;
export const MIN_SESSION_TIMEOUT_MINUTES = 5;
export const MAX_SESSION_TIMEOUT_MINUTES = 240;

export function parseJsonbNumber(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    try {
      return parseJsonbNumber(JSON.parse(trimmed), fallback);
    } catch {
      return fallback;
    }
  }
  if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
    return parseJsonbNumber((raw as { value: unknown }).value, fallback);
  }
  return fallback;
}

export function clampSessionTimeoutMinutes(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_SESSION_TIMEOUT_MINUTES;
  return Math.min(
    MAX_SESSION_TIMEOUT_MINUTES,
    Math.max(MIN_SESSION_TIMEOUT_MINUTES, Math.round(raw)),
  );
}

/** 提示出现在「超时 − 5 分钟」，且至少早于登出 1 分钟。 */
export function idleLockMinutes(timeoutMinutes: number): {
  timeoutMinutes: number;
  warnMinutes: number;
} {
  const timeout = clampSessionTimeoutMinutes(timeoutMinutes);
  const warnMinutes = Math.max(1, Math.min(timeout - 1, timeout - 5));
  return { timeoutMinutes: timeout, warnMinutes };
}

export function idleLockMs(timeoutMinutes: number): { warnMs: number; logoutMs: number } {
  const { timeoutMinutes: timeout, warnMinutes } = idleLockMinutes(timeoutMinutes);
  return {
    warnMs: warnMinutes * 60 * 1000,
    logoutMs: timeout * 60 * 1000,
  };
}
