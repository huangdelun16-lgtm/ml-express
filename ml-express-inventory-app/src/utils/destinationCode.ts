import { normalizePackDestination } from '../constants/destinationOptions';
import { normalizeOwnerKey } from './storeOwnership';

/** 统一目的地 / 区域码比较（MDY、MSE、MUSE 等） */
export function normalizeDestinationCode(code: string): string {
  const raw = code.trim().toUpperCase();
  if (!raw) return '';
  const packed = normalizePackDestination(raw);
  if (packed) return packed;
  const key = normalizeOwnerKey(raw);
  if (key === 'MUSE') return 'MSE';
  if (key === 'RUILI') return 'RUI';
  return key || raw.slice(0, 3);
}

export function destinationCodesMatch(a: string, b: string): boolean {
  const na = normalizeDestinationCode(a);
  const nb = normalizeDestinationCode(b);
  if (!na || !nb) return false;
  return na === nb;
}
