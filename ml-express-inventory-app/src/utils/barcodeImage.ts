/** Code128-B 模块宽度表。条码在本机生成，不依赖外网图片服务。 */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
] as const;

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;
const DATA_URI_CACHE_LIMIT = 64;
const dataUriCache = new Map<string, string>();

export type Code128ModuleRun = {
  /** true = 黑条，false = 空白 */
  black: boolean;
  /** 模块宽度（相对单位） */
  modules: number;
};

function encodeCode128B(code: string): number[] {
  const values = [...code].map((char) => {
    const charCode = char.charCodeAt(0);
    if (charCode < 32 || charCode > 126) {
      throw new Error('CODE128_UNSUPPORTED_CHARACTER');
    }
    return charCode - 32;
  });
  const checksum =
    (START_B + values.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103;
  return [START_B, ...values, checksum, STOP];
}

/** 生成 Code128-B 的黑白模块序列（含 quiet zone），供原生 View 渲染可扫条码 */
export function getCode128ModuleRuns(code: string): Code128ModuleRun[] {
  const trimmed = code.trim();
  if (!trimmed) return [];

  const patterns = encodeCode128B(trimmed).map((value) => CODE128_PATTERNS[value]);
  const runs: Code128ModuleRun[] = [{ black: false, modules: QUIET_ZONE_MODULES }];

  for (const pattern of patterns) {
    [...pattern].forEach((digit, index) => {
      runs.push({ black: index % 2 === 0, modules: Number(digit) });
    });
  }

  runs.push({ black: false, modules: QUIET_ZONE_MODULES });
  return runs;
}

export function getCode128TotalModules(code: string): number {
  return getCode128ModuleRuns(code).reduce((sum, run) => sum + run.modules, 0);
}

export function buildCode128Svg(
  code: string,
  opts?: { scale?: number; height?: number; includeText?: boolean },
): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  const moduleWidth = Math.max(1, opts?.scale ?? 2);
  const barHeight = Math.max(40, (opts?.height ?? 12) * 4);
  const runs = getCode128ModuleRuns(trimmed);
  const totalModules = runs.reduce((sum, run) => sum + run.modules, 0);
  const textHeight = opts?.includeText === false ? 0 : 18;
  let x = 0;
  const bars: string[] = [];

  for (const run of runs) {
    if (run.black) {
      bars.push(
        `<rect x="${x * moduleWidth}" y="0" width="${run.modules * moduleWidth}" height="${barHeight}"/>`,
      );
    }
    x += run.modules;
  }

  const width = totalModules * moduleWidth;
  const text = textHeight
    ? `<text x="${width / 2}" y="${barHeight + 14}" text-anchor="middle" font-family="monospace" font-size="12">${escapeSvgText(trimmed)}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barHeight + textHeight}" viewBox="0 0 ${width} ${barHeight + textHeight}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${bars.join('')}</g>${text}</svg>`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cacheDataUri(key: string, value: string): void {
  if (dataUriCache.size >= DATA_URI_CACHE_LIMIT) {
    const oldestKey = dataUriCache.keys().next().value;
    if (oldestKey) dataUriCache.delete(oldestKey);
  }
  dataUriCache.set(key, value);
}

export function getBarcodeImageUrl(
  code: string,
  opts?: { scale?: number; height?: number; includeText?: boolean },
): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  const cacheKey = `${trimmed}|${opts?.scale ?? 2}|${opts?.height ?? 12}|${opts?.includeText !== false}`;
  const cached = dataUriCache.get(cacheKey);
  if (cached) return cached;
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildCode128Svg(trimmed, opts))}`;
  cacheDataUri(cacheKey, dataUri);
  return dataUri;
}

/** 保留异步签名供打印服务复用；实现完全本地化。 */
export async function fetchBarcodeDataUri(
  code: string,
  opts?: { scale?: number; height?: number },
): Promise<string> {
  return getBarcodeImageUrl(code, { ...opts, includeText: false });
}

export function clearBarcodeDataUriCache(): void {
  dataUriCache.clear();
}

export function getBarcodeDataUriCacheSize(): number {
  return dataUriCache.size;
}
