export type CustomerSignPickupType = 'self' | 'proxy';

export type SignaturePoint = { x: number; y: number };
export type SignatureStroke = SignaturePoint[];

export type CustomerSignReceiptInput = {
  signPhone: string;
  pickupType: CustomerSignPickupType;
  proxyName?: string;
  signatureStrokes: SignatureStroke[];
};

export type CustomerSignReceipt = CustomerSignReceiptInput & {
  signedByOperator?: string;
  signedAt?: string;
};

export function pickupTypeLabel(type: CustomerSignPickupType | string | undefined): string {
  if (type === 'proxy') return '代收';
  if (type === 'self') return '本人签收';
  return '';
}

export function serializeSignatureStrokes(strokes: SignatureStroke[]): string {
  return JSON.stringify(strokes);
}

export function parseSignatureStrokes(raw: string | undefined | null): SignatureStroke[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((stroke) => Array.isArray(stroke))
      .map((stroke) =>
        (stroke as unknown[])
          .map((point) => {
            if (!point || typeof point !== 'object') return null;
            const row = point as Record<string, unknown>;
            const x = Number(row.x);
            const y = Number(row.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x, y };
          })
          .filter((p): p is SignaturePoint => p != null),
      )
      .filter((stroke) => stroke.length > 0);
  } catch {
    return [];
  }
}

export function countSignaturePoints(strokes: SignatureStroke[]): number {
  return strokes.reduce((sum, stroke) => sum + stroke.length, 0);
}

export function validateCustomerSignReceipt(input: CustomerSignReceiptInput): string | null {
  if (input.pickupType !== 'self' && input.pickupType !== 'proxy') {
    return '请选择本人签收或代收';
  }

  if (input.pickupType === 'proxy') {
    const phone = input.signPhone.trim();
    if (!phone) return '请填写代收人电话';
    if (phone.replace(/\D/g, '').length < 6) return '电话格式不正确';
    if (!input.proxyName?.trim()) return '请填写代收人姓名';
  }

  if (countSignaturePoints(input.signatureStrokes) < 8) {
    return '请收件人在签名区手写签名';
  }

  return null;
}
