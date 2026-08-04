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

/** 多个入库：同批次共用基础入库号，每行追加 (总件数-序号)，如 MDY131412040826(3-2) */
export function formatPackagingStockInLineBarcode(
  baseBarcode: string,
  total: number,
  index: number,
): string {
  return `${baseBarcode}(${total}-${index})`;
}

export function parsePackagingStockInLineBarcode(barcode: string): {
  base: string;
  total: number;
  index: number;
} | null {
  const trimmed = barcode.trim();
  const match = trimmed.match(/^(.+)\((\d+)-(\d+)\)$/);
  if (!match) return null;
  const total = Number(match[2]);
  const index = Number(match[3]);
  if (!Number.isFinite(total) || !Number.isFinite(index) || total < 1 || index < 1 || index > total) {
    return null;
  }
  return { base: match[1], total, index };
}

export function isPackagingStockInLineBarcode(barcode: string): boolean {
  return parsePackagingStockInLineBarcode(barcode) !== null;
}

/** 展示用：拆成基础入库号与 (3-1) 序号后缀 */
export function splitPackagingStockInLineBarcodeDisplay(barcode: string): {
  base: string;
  suffix: string | null;
} {
  const parsed = parsePackagingStockInLineBarcode(barcode);
  if (!parsed) return { base: barcode, suffix: null };
  return {
    base: parsed.base,
    suffix: `(${parsed.total}-${parsed.index})`,
  };
}

/** 一次生成多个入库整批入库条码（共享同一基础号） */
export async function generatePackagingStockInLineBarcodes(
  destination: string,
  lineCount: number,
  at: Date,
  exists: (barcode: string) => Promise<boolean>,
): Promise<string[]> {
  if (lineCount <= 0) return [];

  let base = generateInboundBarcode(destination, at);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidates = Array.from({ length: lineCount }, (_, i) =>
      formatPackagingStockInLineBarcode(base, lineCount, i + 1),
    );
    let conflict = false;
    for (const code of candidates) {
      if (await exists(code)) {
        conflict = true;
        break;
      }
    }
    if (!conflict) return candidates;
    base = `${generateInboundBarcode(destination, at)}${attempt}`;
  }

  const fallbackBase = `${generateInboundBarcode(destination, at)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  return Array.from({ length: lineCount }, (_, i) =>
    formatPackagingStockInLineBarcode(fallbackBase, lineCount, i + 1),
  );
}
