/** 解析入库流水 note（总费用 · 付款方式 · 用户备注）— 支持中/英/缅入库标签 */

import { cnyToMmk, formatCnyInput } from './crossBorderFx';
import {
  isFxLockNotePart,
  parseFxLockFromNote,
  pickFxLock,
  type CrossBorderFxLock,
} from './crossBorderFxLock';

const FEE_LABEL_PATTERN = /^(?:总费用|Total fee|ပို့ဆောင်ခ)\s+([\d.]+)\s*MMK$/i;
const QUOTE_CNY_PATTERN = /^(?:报价|Quote)\s+([\d.]+)\s*CNY$/i;

export type ChargeBasis = 'volume' | 'weight';

const CHARGE_VOLUME_NOTE = '收费体积';
const CHARGE_WEIGHT_NOTE = '收费重量';

/** 写入入库流水的中文标记。界面语言不要写进 note。 */
export function chargeBasisNote(basis: ChargeBasis): string {
  return basis === 'volume' ? CHARGE_VOLUME_NOTE : CHARGE_WEIGHT_NOTE;
}

export function parseChargeBasis(raw: string | undefined): ChargeBasis | undefined {
  const text = String(raw || '').trim();
  if (text === CHARGE_VOLUME_NOTE || text === '体积重量') return 'volume';
  if (text === CHARGE_WEIGHT_NOTE || text === '收费重量' || text === '按重量') return 'weight';
  return undefined;
}

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
  chargeBasis?: ChargeBasis;
  userNote?: string;
  fxLock?: CrossBorderFxLock;
} {
  const trimmed = note.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
  let totalFee: string | undefined;
  let quoteCny: string | undefined;
  let paymentLabel: string | undefined;
  let chargeBasis: ChargeBasis | undefined;
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
    const basis = parseChargeBasis(part);
    if (basis) {
      chargeBasis = basis;
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
    chargeBasis,
    userNote: userParts.length ? userParts.join(' · ') : undefined,
    fxLock: fxLock ?? undefined,
  };
}

const SYSTEM_NOTE_PART =
  /^(?:多个入库|入库包装日期(?:\s.*)?|打包入(?:\s.*)?|到站交付确认.*|到站收货入库.*|到站入库(?:\s.*)?|中转站到站.*)$/;

const QUOTE_NOTE_PART = /^(?:报价|Quote)\s+[\d.]+\s*CNY$/i;

/** 把入库流水里的「报价 X CNY」换成新金额。原来没有报价时补在最前面。 */
export function replaceInboundQuoteCny(note: string, quoteCny: number): string {
  const label = `报价 ${formatCnyInput(quoteCny)} CNY`;
  const parts = String(note || '')
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const index = parts.findIndex((part) => QUOTE_NOTE_PART.test(part));
  if (index >= 0) {
    if (parts[index] === label) return parts.join(' · ');
    parts[index] = label;
    return parts.join(' · ');
  }
  parts.unshift(label);
  return parts.join(' · ');
}

/** 订单详情里的备注：只留客户自己写的话，报价、到付、打包标记都不算备注。 */
export function customerFacingInboundNote(note: string | null | undefined): string {
  const userNote = parseInboundMovementNote(String(note || '')).userNote?.trim() || '';
  if (!userNote) return '';
  return userNote
    .split(' · ')
    .map((part) => part.trim())
    .filter((part) => part && !SYSTEM_NOTE_PART.test(part))
    .join(' · ');
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

const TOTAL_FEE_PART = /^(?:总费用|Total fee|ပို့ဆောင်ခ)\s+[\d.]+\s*MMK$/i;

/** 签收按发票人民币改写报价，并用签收时的汇率写成缅币。旧的总费用一并换成这个数。 */
export function applySignedQuoteSettlement(note: string, quoteCny: number, rate: number | null): string {
  const withQuote = replaceInboundQuoteCny(note, quoteCny);
  if (rate == null || rate <= 0) return withQuote;
  const mmk = cnyToMmk(quoteCny, rate) ?? 0;
  const feePart = `总费用 ${mmk} MMK`;
  const parts = withQuote
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const feeIndex = parts.findIndex((part) => TOTAL_FEE_PART.test(part));
  if (feeIndex >= 0) parts[feeIndex] = feePart;
  else {
    const quoteIndex = parts.findIndex((part) => QUOTE_NOTE_PART.test(part));
    parts.splice(quoteIndex >= 0 ? quoteIndex + 1 : 0, 0, feePart);
  }
  return parts.join(' · ');
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
): { totalFee?: string; quoteCny?: string; paymentLabel?: string; chargeBasis?: ChargeBasis } {
  let totalFee: string | undefined;
  let quoteCny: string | undefined;
  let paymentLabel: string | undefined;
  let chargeBasis: ChargeBasis | undefined;
  for (const note of notes) {
    const parsed = parseInboundMovementNote(String(note || ''));
    if (!totalFee && parsed.totalFee?.trim()) totalFee = parsed.totalFee.trim();
    if (!quoteCny && parsed.quoteCny?.trim()) quoteCny = parsed.quoteCny.trim();
    if (!paymentLabel && parsed.paymentLabel) paymentLabel = parsed.paymentLabel;
    if (!chargeBasis && parsed.chargeBasis) chargeBasis = parsed.chargeBasis;
    if (totalFee && quoteCny && paymentLabel && chargeBasis) break;
  }
  return { totalFee, quoteCny, paymentLabel, chargeBasis };
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
