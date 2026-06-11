import { Vibration } from 'react-native';

/** 规范化扫码结果：去空白、控制字符，PKG 转大写 */
export function normalizeScanCode(raw: string): string {
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!cleaned) return '';
  if (cleaned.toUpperCase().startsWith('PKG')) return cleaned.toUpperCase();
  return cleaned;
}

export function vibrateScanSuccess(): void {
  try {
    Vibration.vibrate(40);
  } catch {
    /* 部分设备不支持 */
  }
}

export function shouldAcceptScan(
  code: string,
  lastCode: string,
  lastAt: number,
  cooldownMs: number,
  locked: boolean,
): boolean {
  if (locked || !code) return false;
  const now = Date.now();
  if (code === lastCode && now - lastAt < cooldownMs) return false;
  return true;
}
