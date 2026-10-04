/** 解析入库流水 note（总费用 · 付款方式 · 用户备注）— 支持中/英/缅入库标签 */

import { cnyToMmk } from './crossBorderFx';
import {
  isFxLockNotePart,
  parseFxLockFromNote,
  pickFxLock,
  type CrossBorderFxLock,
} from './crossBorderFxLock';

const FEE_LABEL_PATTERN = /^(?:总费用|Total fee|ပို့ဆောင်ခ)\s+([\d.]+)\s*MMK$/i;
const QUOTE_CNY_PATTERN = /^(?:报价|Quote)\s+([\d.]+)\s*CNY$/i;

/** 付款方式归一化为中文业务标签（到付 / 预付） */
export function normalizePaymentLabel(raw: string | undefined): string | undefined {
  const p = String(raw || '').trim();
  if (!p) return undefined;
  const lower = p.toLowerCase();
  if (p === '到付' || lower === 'cod') return '到付';
  if (p === '预付' || lower === 'prepaid' || p === 'ကြိုပေးချေ') return '预付';
  return p;
}

export function parseInboundMovementNote(note: string): {
  totalFee?: string;
  quoteCny?: string;
  paymentLabel?: string;
  userNote?: string;
  fxLock?: CrossBorderFxLock;
} {
  const trimmed = note.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
  let totalFee: string | undefined;
  let quoteCny: string | undefined;
  let paymentLabel: string | undefined;
  const userParts: string[] = [];

  for (const part of parts) {
    const feeMatch = part.match(FEE_LABEL_PATTERN);
    if (feeMatch) {
      totalFee = feeMatch[1];
      continue;
    }
    const quoteMatch = part.match(QUOTE_CNY_PATTERN);
    if (quoteMatch) {
      quoteCny = quoteMatch[1];
      continue;
    }
    if (isFxLockNotePart(part)) {
      continue;
    }
    const normalized = normalizePaymentLabel(part);
    if (normalized === '到付' || normalized === '预付') {
      paymentLabel = normalized;
      continue;
    }
    userParts.push(part);
  }

  const fxLock = parseFxLockFromNote(trimmed);
  return {
    totalFee,
    quoteCny,
    paymentLabel,
    userNote: userParts.length ? userParts.join(' · ') : undefined,
    fxLock: fxLock ?? undefined,
  };
}

export function pickNotesFxLock(
  ...notes: Array<string | null | undefined>
): CrossBorderFxLock | null {
  return pickFxLock(...notes.map((note) => parseInboundMovementNote(String(note || '')).fxLock));
}

export function inboundNoteHasFeeOrPayment(note: string): boolean {
  const parsed = parseInboundMovementNote(note);
  return Boolean(parsed.totalFee?.trim() || parsed.quoteCny?.trim() || parsed.paymentLabel?.trim());
}

/** 签收时把入库人民币按当天汇率写成缅币。已有总费用 MMK 的不再重算。 */
export function settleQuoteNoteAtRate(note: string, rate: number | null): string {
  const parsed = parseInboundMovementNote(note);
  if (parsed.totalFee != null) return note;
  if (parsed.quoteCny == null || rate == null || rate <= 0) return note;
  const cny = Number(parsed.quoteCny);
  if (!Number.isFinite(cny) || cny < 0) return note;
  const mmk = cnyToMmk(cny, rate);
  if (mmk == null) return note;
  const parts = note
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const feePart = `总费用 ${mmk} MMK`;
  const quoteIndex = parts.findIndex((part) => QUOTE_CNY_PATTERN.test(part));
  parts.splice(quoteIndex >= 0 ? quoteIndex + 1 : 0, 0, feePart);
  return parts.join(' · ');
}

/** 到站/中转补写的入库流水，不含发站总费用 */
export const HUB_RECEIVE_INBOUND_NOTE_RE =
  /到站交付确认|到站收货入库|到站入库\s*·|中转站到站/;

export function pickInboundFeeFields(
  ...notes: Array<string | null | undefined>
): { totalFee?: string; quoteCny?: string; paymentLabel?: string } {
  let totalFee: string | undefined;
  let quoteCny: string | undefined;
  let paymentLabel: string | undefined;
  for (const note of notes) {
    const parsed = parseInboundMovementNote(String(note || ''));
    if (!totalFee && parsed.totalFee?.trim()) totalFee = parsed.totalFee.trim();
    if (!quoteCny && parsed.quoteCny?.trim()) quoteCny = parsed.quoteCny.trim();
    if (!paymentLabel && parsed.paymentLabel) paymentLabel = parsed.paymentLabel;
    if (totalFee && quoteCny && paymentLabel) break;
  }
  return { totalFee, quoteCny, paymentLabel };
}

/** 发票/详情用发站那条入库（带总费用），不要用后补的「到站交付确认」 */
export function pickPrimaryInboundMovement<T extends { created_at?: string; note?: string }>(
  moves: T[],
): T | undefined {
  if (moves.length === 0) return undefined;
  const oldestFirst = [...moves].sort((a, b) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
  );
  return (
    oldestFirst.find((row) => inboundNoteHasFeeOrPayment(row.note ?? '')) ??
    oldestFirst.find((row) => !HUB_RECEIVE_INBOUND_NOTE_RE.test(row.note ?? '')) ??
    oldestFirst[0]
  );
}
