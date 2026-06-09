/** 从目的地提取条码前缀，如 MDY */
export function extractDestinationCode(destination: string): string {
  const raw = destination.trim().toUpperCase();
  const token = raw.match(/[A-Z0-9]{2,}/)?.[0] ?? raw.replace(/[^A-Z0-9]/g, '');
  if (token.length >= 3) return token.slice(0, 3);
  if (token.length > 0) return token.padEnd(3, 'X');
  return 'PKG';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 缅甸时间（Asia/Yangon）：目的地码 + 秒 + 分 + 时 + 日 + 月 + 年 */
export function generateInboundBarcode(destination: string, at = new Date()): string {
  const prefix = extractDestinationCode(destination);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yangon',
    second: '2-digit',
    minute: '2-digit',
    hour: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  // 秒分时日月年
  return `${prefix}${get('second')}${get('minute')}${get('hour')}${get('day')}${get('month')}${get('year')}`;
}

export async function generateUniqueInboundBarcode(
  destination: string,
  exists: (barcode: string) => Promise<boolean>,
): Promise<string> {
  let barcode = generateInboundBarcode(destination);
  for (let i = 0; i < 8; i += 1) {
    if (!(await exists(barcode))) return barcode;
    barcode = `${generateInboundBarcode(destination)}${i}`;
  }
  return `${generateInboundBarcode(destination)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}
