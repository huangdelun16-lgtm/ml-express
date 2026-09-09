/** 解析入库流水 note（总费用 · 付款方式 · 用户备注）— 支持中/英/缅入库标签 */

import {
  isFxLockNotePart,
  parseFxLockFromNote,
  pickFxLock,
  type CrossBorderFxLock,
} from './crossBorderFxLock';

const FEE_LABEL_PATTERN = /^(?:总费用|Total fee|ပို့ဆောင်ခ)\s+([\d.]+)\s*MMK$/i;

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
  paymentLabel?: string;
  userNote?: string;
  fxLock?: CrossBorderFxLock;
} {
  const trimmed = note.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
  let totalFee: string | undefined;
  let paymentLabel: string | undefined;
  const userParts: string[] = [];

  for (const part of parts) {
    const feeMatch = part.match(FEE_LABEL_PATTERN);
    if (feeMatch) {
      totalFee = feeMatch[1];
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
  return Boolean(parsed.totalFee?.trim() || parsed.paymentLabel?.trim());
}

/** 到站/中转补写的入库流水，不含发站总费用 */
export const HUB_RECEIVE_INBOUND_NOTE_RE =
  /到站交付确认|到站收货入库|到站入库\s*·|中转站到站/;

export function pickInboundFeeFields(
  ...notes: Array<string | null | undefined>
): { totalFee?: string; paymentLabel?: string } {
  let totalFee: string | undefined;
  let paymentLabel: string | undefined;
  for (const note of notes) {
    const parsed = parseInboundMovementNote(String(note || ''));
    if (!totalFee && parsed.totalFee?.trim()) totalFee = parsed.totalFee.trim();
    if (!paymentLabel && parsed.paymentLabel) paymentLabel = parsed.paymentLabel;
    if (totalFee && paymentLabel) break;
  }
  return { totalFee, paymentLabel };
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
