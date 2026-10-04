import { Vibration } from 'react-native';

/** 短于这个长度的结果多半是残码或噪声，不交给查询 */
export const MIN_SCAN_CODE_LENGTH = 4;

/** 只出现一次的读数，等这么久没有更长的码再收下 */
export const SCAN_CONFIRM_MS = 140;

/** 规范化扫码结果：去控制字符/空白、AIM 前缀，并统一大写 */
export function normalizeScanCode(raw: string): string {
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '').trim().replace(/^\][A-Za-z]\d/, '');
  if (!cleaned) return '';
  return cleaned.toUpperCase();
}

/** 从相机回调提取最可靠的扫码文本（兼容 Android raw 字段） */
export function extractScanPayload(data: string, raw?: string | null): string {
  const candidates = [data, raw ?? '']
    .map((value) => normalizeScanCode(value))
    .filter(Boolean);
  if (candidates.length === 0) return '';
  const unique = [...new Set(candidates)];
  return unique.sort((a, b) => b.length - a.length)[0] ?? '';
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
  now = Date.now(),
): boolean {
  if (locked || code.length < MIN_SCAN_CODE_LENGTH) return false;
  if (code === lastCode && now - lastAt < cooldownMs) return false;
  return true;
}

/** 8/12/13 位纯数字是商品码，面单扫码时让路给运单 */
export function isRetailBarcode(code: string): boolean {
  return /^\d{8}$/.test(code) || /^\d{12}$/.test(code) || /^\d{13}$/.test(code);
}

/** 同一帧里同时出现商品码和运单时，留下运单 */
export function preferWaybill(current: string, incoming: string): string {
  const currentRetail = isRetailBarcode(current);
  const incomingRetail = isRetailBarcode(incoming);
  if (currentRetail && !incomingRetail) return incoming;
  if (!currentRetail && incomingRetail) return current;
  return incoming;
}

export type ScanFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewWidth: number;
  viewHeight: number;
};

export function scanFrameRect(
  viewWidth: number,
  viewHeight: number,
  frameWidth: number,
  frameHeight: number,
  topFlex = 0.8,
  bottomFlex = 1.25,
): ScanFrame | null {
  if (viewWidth <= 0 || viewHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) return null;
  const free = Math.max(0, viewHeight - frameHeight);
  const top = free * (topFlex / (topFlex + bottomFlex));
  return {
    x: (viewWidth - frameWidth) / 2,
    y: top,
    width: frameWidth,
    height: frameHeight,
    viewWidth,
    viewHeight,
  };
}

type ScanBounds = {
  origin: { x: number; y: number };
  size: { width: number; height: number };
};

/** 只收中心落在取景框里的码。坐标明显不在预览里时不拦截，避免机型坐标系不同把正常扫码挡掉 */
export function isBarcodeInsideFrame(
  bounds: ScanBounds | null | undefined,
  frame: ScanFrame | null,
  margin = 36,
): boolean {
  if (!frame || !bounds || bounds.size.width <= 0 || bounds.size.height <= 0) return true;
  const cx = bounds.origin.x + bounds.size.width / 2;
  const cy = bounds.origin.y + bounds.size.height / 2;
  if (
    cx < -frame.viewWidth ||
    cy < -frame.viewHeight ||
    cx > frame.viewWidth * 2 ||
    cy > frame.viewHeight * 2
  ) {
    return true;
  }
  return (
    cx >= frame.x - margin &&
    cx <= frame.x + frame.width + margin &&
    cy >= frame.y - margin &&
    cy <= frame.y + frame.height + margin
  );
}

export type ScanDecision =
  | { action: 'ignore' }
  | { action: 'hold'; code: string }
  | { action: 'accept'; code: string };

/**
 * 同一码连续出现两次才收下。更长的读数会替换残码；商品码不会盖掉正在确认的运单。
 * immediate 用于手动输入，一次即可。
 */
export function decideScanRead(
  code: string,
  pending: string,
  lastAccepted: string,
  lastAt: number,
  now: number,
  cooldownMs: number,
  locked: boolean,
  immediate: boolean,
): ScanDecision {
  if (!shouldAcceptScan(code, lastAccepted, lastAt, cooldownMs, locked, now)) return { action: 'ignore' };
  if (immediate) return { action: 'accept', code };
  if (pending && pending !== code && pending.includes(code)) return { action: 'hold', code: pending };
  if (pending && code !== pending && code.includes(pending)) return { action: 'hold', code };
  if (pending === code) return { action: 'accept', code };
  if (pending) return { action: 'hold', code: preferWaybill(pending, code) };
  return { action: 'hold', code };
}
