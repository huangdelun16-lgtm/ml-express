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

export type CustomerSignValidationCode =
  | 'signNeedPickupType'
  | 'signNeedProxyPhone'
  | 'signInvalidPhone'
  | 'signNeedProxyName'
  | 'signNeedSignature';

export function pickupTypeLabel(
  type: CustomerSignPickupType | string | undefined,
  labels: { self: string; proxy: string },
): string {
  if (type === 'proxy') return labels.proxy;
  if (type === 'self') return labels.self;
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

export function validateCustomerSignReceipt(
  input: CustomerSignReceiptInput,
): CustomerSignValidationCode | null {
  if (input.pickupType !== 'self' && input.pickupType !== 'proxy') {
    return 'signNeedPickupType';
  }

  if (input.pickupType === 'proxy') {
    const phone = input.signPhone.trim();
    if (!phone) return 'signNeedProxyPhone';
    if (phone.replace(/\D/g, '').length < 6) return 'signInvalidPhone';
    if (!input.proxyName?.trim()) return 'signNeedProxyName';
  }

  if (countSignaturePoints(input.signatureStrokes) < 8) {
    return 'signNeedSignature';
  }

  return null;
}
