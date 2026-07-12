/** 解析入库流水 note（总费用 · 付款方式 · 用户备注）— 支持中/英/缅入库标签 */

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
    const normalized = normalizePaymentLabel(part);
    if (normalized === '到付' || normalized === '预付') {
      paymentLabel = normalized;
      continue;
    }
    userParts.push(part);
  }

  return {
    totalFee,
    paymentLabel,
    userNote: userParts.length ? userParts.join(' · ') : undefined,
  };
}

export function inboundNoteHasFeeOrPayment(note: string): boolean {
  const parsed = parseInboundMovementNote(note);
  return Boolean(parsed.totalFee?.trim() || parsed.paymentLabel?.trim());
}
