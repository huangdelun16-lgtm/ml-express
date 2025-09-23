export type TrackingFormatOptions = {
    withSeparators?: boolean; // 形如 20250910-150530-852
    randomDigits?: 3 | 4;     // 防重复随机位数
};

// 生成缅甸时区(Asia/Yangon, UTC+6:30)当前时间（不依赖服务器本地时区）
function getMyanmarNow(): Date {
    const nowUtc = Date.now();
    const offsetMs = 6.5 * 60 * 60 * 1000; // +06:30
    return new Date(nowUtc + offsetMs);
}

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function randomNDigits(n: 3 | 4): string {
    const min = n === 3 ? 100 : 1000;
    const max = n === 3 ? 999 : 9999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// 生成：C + YYYYMMDD + HHMMSS + 随机数（可选分隔符）
export function generateMyanmarTrackingNumber(opts: TrackingFormatOptions = {}): string {
    const { withSeparators = false, randomDigits = 3 } = opts;
    const d = getMyanmarNow();
    const yyyy = d.getUTCFullYear();
    const MM = pad2(d.getUTCMonth() + 1);
    const dd = pad2(d.getUTCDate());
    const HH = pad2(d.getUTCHours());
    const mm = pad2(d.getUTCMinutes());
    const ss = pad2(d.getUTCSeconds());
    const rnd = randomNDigits(randomDigits);
    if (withSeparators) {
        return `C${yyyy}${MM}${dd}-${HH}${mm}${ss}-${rnd}`;
    }
    return `C${yyyy}${MM}${dd}${HH}${mm}${ss}${rnd}`;
}

// 生成不带前缀的纯日期时间+随机数（若有需要）
export function generateMyanmarDateTimeId(opts: Omit<TrackingFormatOptions, 'withSeparators'> & { withSeparators?: boolean } = {}): string {
    const { withSeparators = false, randomDigits = 3 } = opts;
    const d = getMyanmarNow();
    const yyyy = d.getUTCFullYear();
    const MM = pad2(d.getUTCMonth() + 1);
    const dd = pad2(d.getUTCDate());
    const HH = pad2(d.getUTCHours());
    const mm = pad2(d.getUTCMinutes());
    const ss = pad2(d.getUTCSeconds());
    const rnd = randomNDigits(randomDigits);
    return withSeparators ? `${yyyy}${MM}${dd}-${HH}${mm}${ss}-${rnd}` : `${yyyy}${MM}${dd}${HH}${mm}${ss}${rnd}`;
}


