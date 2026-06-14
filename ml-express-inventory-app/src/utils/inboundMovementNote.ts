/** 解析入库流水 note（总费用 · 付款方式 · 用户备注） */
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
    const feeMatch = part.match(/^总费用\s+([\d.]+)\s*MMK$/i);
    if (feeMatch) {
      totalFee = feeMatch[1];
      continue;
    }
    if (part === '到付' || part === '预付') {
      paymentLabel = part;
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
