/** Code128 条码图（bwip-js 在线 API，打印前会内嵌为 base64） */
export function getBarcodeImageUrl(
  code: string,
  opts?: { scale?: number; height?: number; includeText?: boolean },
): string {
  const scale = opts?.scale ?? 3;
  const height = opts?.height ?? 12;
  const text = opts?.includeText !== false ? '&includetext' : '';
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&scale=${scale}&height=${height}${text}`;
}

const dataUriCache = new Map<string, string>();

function bytesToBase64(bytes: Uint8Array): string {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += table[(triplet >> 18) & 0x3f];
    output += table[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? table[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? table[triplet & 0x3f] : '=';
  }
  return output;
}

/** 拉取条码 PNG 并转为 data URI，供打印 HTML 内嵌（避免蓝牙/离线时远程图加载失败） */
export async function fetchBarcodeDataUri(
  code: string,
  opts?: { scale?: number; height?: number },
): Promise<string> {
  const trimmed = code.trim();
  if (!trimmed) return '';

  const cacheKey = `${trimmed}|${opts?.scale ?? 2}|${opts?.height ?? 12}`;
  const cached = dataUriCache.get(cacheKey);
  if (cached) return cached;

  const url = getBarcodeImageUrl(trimmed, { ...opts, includeText: false });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Barcode image fetch failed (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = bytesToBase64(new Uint8Array(buffer));
  const dataUri = `data:image/png;base64,${base64}`;
  dataUriCache.set(cacheKey, dataUri);
  return dataUri;
}

export function clearBarcodeDataUriCache(): void {
  dataUriCache.clear();
}
