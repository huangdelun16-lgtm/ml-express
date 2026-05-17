/**
 * IMPORT LICENCE PDF/图片：提取文字并解析 REGISTER NO、H.S CODE、货物描述、单位、单价、币种。
 */

export type ParsedLicenceLine = {
  registerNo: string;
  hsCode: string;
  cargoDesc: string;
  unitCode: string;
  unitPrice: string;
  currency: string;
};

const PDF_WORKER =
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[:：]\s*/g, ': ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function pdfFirstPageToPngDataUrl(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 1200 / Math.max(vp1.width, 1));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  const task = page.render({ canvasContext: ctx, viewport });
  await task.promise;
  return canvas.toDataURL('image/png');
}

export async function extractPdfPlainText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const chunks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const line = tc.items
      .map((it) => ('str' in it && typeof it.str === 'string' ? it.str : ''))
      .join(' ');
    if (line.trim()) chunks.push(line.trim());
  }
  return chunks.join('\n');
}

async function tesseractTextFromImageLike(image: string | File): Promise<string> {
  const { recognize } = await import('tesseract.js');
  const langs = 'eng';
  const r = await recognize(image, langs, {});
  return (r.data?.text as string | undefined) || '';
}

export async function ocrPdfFirstPage(file: File): Promise<string> {
  const dataUrl = await pdfFirstPageToPngDataUrl(file);
  return tesseractTextFromImageLike(dataUrl);
}

export async function ocrImageFile(file: File): Promise<string> {
  return tesseractTextFromImageLike(file);
}

function textLooksInsufficient(text: string): boolean {
  const t = text.replace(/\s/g, '');
  if (t.length < 32) return true;
  if (!/\d{6,}/.test(t)) return true;
  if (!/REGISTER|REG\.?\s*NO|H\.?\s*S|HS\s*CODE|CARGO|UNIT|PRICE|SET/i.test(text))
    return true;
  return false;
}

/** 从 PDF：先全页文字，不足再首页 OCR。 */
export async function extractLicenceTextFromPdf(file: File): Promise<string> {
  let text = normalizeWhitespace(await extractPdfPlainText(file));
  if (textLooksInsufficient(text)) {
    const ocr = normalizeWhitespace(await ocrPdfFirstPage(file));
    if (ocr.length > text.length) text = ocr;
  }
  return text;
}

export async function extractLicenceTextFromFile(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage =
    file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
  if (isPdf) return extractLicenceTextFromPdf(file);
  if (isImage) return normalizeWhitespace(await ocrImageFile(file));
  throw new Error('unsupported file type');
}

function cleanRegisterNo(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/g, '');
}

export function parseRegisterNoFromText(text: string): string {
  const flat = text.replace(/\n/g, ' ');
  const patterns = [
    /REGISTER\s*NO\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9/\s-]{3,48}?)(?=\s+H\.?\s*S|\s+CARGO|\s+IMPORT|\s+DATE|\s+NAME|\n|$)/i,
    /REGISTER\s*NO\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9/\s-]+)/i,
    /REG\.?\s*NO\.?\s*[-:]?\s*([A-Z0-9][A-Z0-9/\s-]{3,40})/i,
  ];
  for (const re of patterns) {
    const m = flat.match(re) ?? text.match(re);
    if (m?.[1]) {
      const c = cleanRegisterNo(m[1]);
      if (c.length >= 3) return c;
    }
  }
  return '';
}

function normalizeCurrencyToken(t?: string | null): string {
  if (!t) return '';
  const u = t.toUpperCase().replace(/\$/g, '');
  if (u === 'US' || t.includes('$')) return 'USD';
  if (u === 'RMB' || u === 'CNY') return 'CNY';
  if (u === 'MMK' || /KYAT/i.test(t)) return 'MMK';
  if (/^(USD|CNY|MMK|EUR|GBP)$/.test(u)) return u;
  return '';
}

function sniffDefaultCurrency(text: string): string {
  const order = ['MMK', 'CNY', 'USD', 'EUR', 'GBP'] as const;
  const up = text.toUpperCase();
  for (const c of order) {
    if (up.includes(c)) return c;
  }
  if (/\bKYATS?\b/i.test(text)) return 'MMK';
  if (/\bRMB\b|\bCNY\b/i.test(text)) return 'CNY';
  return 'USD';
}

function isHeaderOrNoiseLine(line: string): boolean {
  if (line.length > 140) return false;
  const u = line.toUpperCase();
  return (
    /^H\.?\s*S\.?\s*CODE/.test(u) ||
    /^CARGO\s*DESC/.test(u) ||
    /^UNIT\s*CODE/.test(u) ||
    /^SET\s*PRICE/.test(u) ||
    /^REGISTER\s*NO/.test(u) ||
    /^NO\.?\s*$/.test(u) ||
    /^PAGE\s*\d/i.test(u)
  );
}

const UNIT_PRICE_TAIL =
  /(.+?)\s+([A-Z][A-Z0-9./-]{1,11})\s+([\d,]+\.?\d*)\s*(USD|CNY|MMK|EUR|GBP|US\$|RMB|KYATS?)?\s*$/i;

/** 行首 8–12 位税则号（缅甸常见 10 位）。 */
const HS_LEADING = /^(\d{8,12})\s+(.+)$/;

export function parseLicenceText(rawText: string): ParsedLicenceLine[] {
  const text = normalizeWhitespace(rawText);
  if (!text) return [];

  const registerNo = parseRegisterNoFromText(text) || '—';
  const defaultCur = sniffDefaultCurrency(text);

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedLicenceLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeaderOrNoiseLine(line)) continue;

    const hm = line.match(HS_LEADING);
    if (hm) {
      const hsCode = hm[1];
      let rest = hm[2].trim();
      const tp = rest.match(UNIT_PRICE_TAIL);
      if (tp) {
        rows.push({
          registerNo,
          hsCode,
          cargoDesc: tp[1].trim().replace(/\s+/g, ' '),
          unitCode: tp[2].trim(),
          unitPrice: tp[3].trim(),
          currency: normalizeCurrencyToken(tp[4]) || defaultCur,
        });
      } else {
        let cargo = rest;
        let unitCode = '—';
        let unitPrice = '—';
        let currency = defaultCur;
        const next = lines[i + 1];
        if (next && !next.match(/^\d{8,12}\s/) && next.match(UNIT_PRICE_TAIL)) {
          const np = next.match(UNIT_PRICE_TAIL);
          if (np) {
            cargo = `${rest} ${np[1].trim()}`.trim();
            unitCode = np[2].trim();
            unitPrice = np[3].trim();
            currency = normalizeCurrencyToken(np[4]) || defaultCur;
            i++;
          }
        }
        rows.push({
          registerNo,
          hsCode,
          cargoDesc: cargo.replace(/\s+/g, ' '),
          unitCode,
          unitPrice,
          currency,
        });
      }
      continue;
    }

    /** 管道或双空格分隔的表格残行 */
    if (/\d{8,12}/.test(line) && /[|│]/.test(line)) {
      const parts = line.split(/[|│]+/).map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const m = p.match(HS_LEADING);
        if (!m) continue;
        const rest2 = m[2].trim();
        const tp2 = rest2.match(UNIT_PRICE_TAIL);
        if (tp2) {
          rows.push({
            registerNo,
            hsCode: m[1],
            cargoDesc: tp2[1].trim().replace(/\s+/g, ' '),
            unitCode: tp2[2].trim(),
            unitPrice: tp2[3].trim(),
            currency: normalizeCurrencyToken(tp2[4]) || defaultCur,
          });
        }
      }
    }
  }

  /** 补救：全文中的独立 HS 行未匹配时，按出现顺序各生成一条弱解析行 */
  if (rows.length === 0) {
    const re = /\b(\d{8,12})\b/g;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = re.exec(text))) {
      const hs = m[1];
      if (seen.has(hs)) continue;
      seen.add(hs);
      const start = m.index;
      const slice = text.slice(start, start + 180);
      const cargo = slice.replace(/^\d{8,12}\s*/, '').split(/\n/)[0].trim();
      rows.push({
        registerNo,
        hsCode: hs,
        cargoDesc: cargo.slice(0, 200) || '—',
        unitCode: '—',
        unitPrice: '—',
        currency: defaultCur,
      });
    }
  }

  return rows.filter((r) => r.hsCode && !/^—$/.test(r.hsCode));
}

export async function parseLicenceFile(file: File): Promise<ParsedLicenceLine[]> {
  const text = await extractLicenceTextFromFile(file);
  return parseLicenceText(text);
}
