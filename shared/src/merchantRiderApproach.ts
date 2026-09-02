/**
 * 商家端：骑手靠近店铺取件时的距离分档。
 * 对齐骑手地图 120m 提示，并增加 300m 预告。纯逻辑，无 DOM / React Native。
 */

export const MERCHANT_RIDER_NEAR_M = 120;
export const MERCHANT_RIDER_APPROACH_M = 300;
export const MERCHANT_RIDER_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;

/** 骑手正在赶来取件（尚未取走） */
export const MERCHANT_RIDER_APPROACH_STATUSES = [
  '打包中',
  '待取件',
  '待收款',
] as const;

export type MerchantRiderApproachBand = 'approach' | 'near';

export type MerchantRiderApproachHit = {
  packageId: string;
  status: string;
  courierName: string;
  distanceMeters: number;
  band: MerchantRiderApproachBand;
};

export type MerchantRiderApproachRow = {
  packageId: string;
  status?: string | null;
  courierName?: string | null;
  courierLat?: number | null;
  courierLng?: number | null;
};

export function isMerchantRiderApproachStatus(status?: string | null): boolean {
  const s = String(status || '').trim();
  return (MERCHANT_RIDER_APPROACH_STATUSES as readonly string[]).includes(s);
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(Number(lat) === 0 && Number(lng) === 0)
  );
}

export function isFreshCourierLocation(
  lastUpdate?: string | null,
  now = Date.now(),
): boolean {
  if (!lastUpdate) return true;
  const t = Date.parse(lastUpdate);
  if (!Number.isFinite(t)) return true;
  return now - t <= MERCHANT_RIDER_LOCATION_MAX_AGE_MS;
}

export function bandForDistanceMeters(
  meters: number,
): MerchantRiderApproachBand | null {
  if (!Number.isFinite(meters) || meters < 0) return null;
  if (meters <= MERCHANT_RIDER_NEAR_M) return 'near';
  if (meters <= MERCHANT_RIDER_APPROACH_M) return 'approach';
  return null;
}

/**
 * 只在「靠近店铺」方向触发：300m 入圈、120m 入圈各一次。
 * 从 120m 退回 300m 不重复预告。
 */
export function merchantRiderApproachAlertKind(
  prevBand: MerchantRiderApproachBand | null,
  nextBand: MerchantRiderApproachBand | null,
): MerchantRiderApproachBand | null {
  if (!nextBand) return null;
  if (nextBand === 'near' && prevBand !== 'near') return 'near';
  if (nextBand === 'approach' && prevBand == null) return 'approach';
  return null;
}

export function merchantRiderApproachKey(
  hit: MerchantRiderApproachHit | null,
): string {
  if (!hit) return '';
  return `${hit.packageId}:${hit.band}`;
}

function statusPriority(status: string): number {
  if (status === '待取件' || status === '待收款') return 0;
  if (status === '打包中') return 1;
  return 2;
}

export function pickMerchantRiderApproach(
  storeLat: number,
  storeLng: number,
  rows: MerchantRiderApproachRow[],
): MerchantRiderApproachHit | null {
  if (!isValidCoord(storeLat, storeLng) || !rows.length) return null;

  let best: MerchantRiderApproachHit | null = null;

  for (const row of rows) {
    if (!row?.packageId) continue;
    const status = String(row.status || '').trim();
    if (!isMerchantRiderApproachStatus(status)) continue;
    if (!isValidCoord(row.courierLat, row.courierLng)) continue;

    const distanceMeters = haversineMeters(
      Number(row.courierLat),
      Number(row.courierLng),
      storeLat,
      storeLng,
    );
    const band = bandForDistanceMeters(distanceMeters);
    if (!band) continue;

    const candidate: MerchantRiderApproachHit = {
      packageId: row.packageId,
      status,
      courierName: String(row.courierName || '').trim() || row.packageId.slice(-6),
      distanceMeters,
      band,
    };

    if (!best) {
      best = candidate;
      continue;
    }
    const closer = candidate.distanceMeters + 4 < best.distanceMeters;
    const similar =
      Math.abs(candidate.distanceMeters - best.distanceMeters) <= 4;
    if (
      closer ||
      (similar && statusPriority(candidate.status) < statusPriority(best.status))
    ) {
      best = candidate;
    }
  }

  return best;
}

export function merchantRiderApproachCopy(
  hit: MerchantRiderApproachHit,
  language: 'zh' | 'en' | 'my',
): { badge: string; title: string; subtitle: string; metersLabel: string } {
  const meters = String(Math.max(1, Math.round(hit.distanceMeters)));
  const packing = hit.status === '打包中';

  if (language === 'en') {
    return {
      badge: hit.band === 'near' ? '120 m' : '300 m',
      title:
        hit.band === 'near'
          ? packing
            ? 'Rider is at the store — finish packing'
            : 'Rider is at the store — hand over now'
          : packing
            ? 'Rider approaching — prepare the order'
            : 'Rider approaching — get ready to hand over',
      subtitle: `${hit.courierName} · #${hit.packageId.slice(-6)}`,
      metersLabel: `About ${meters} m away`,
    };
  }

  if (language === 'my') {
    return {
      badge: hit.band === 'near' ? '120 m' : '300 m',
      title:
        hit.band === 'near'
          ? packing
            ? 'ပို့ဆောင်သူ ဆိုင်အနီးရောက်ပြီ — ထုပ်ပိုးပြီးအောင် လုပ်ပါ'
            : 'ပို့ဆောင်သူ ဆိုင်အနီးရောက်ပြီ — ချက်ချင်း လွှဲပြောင်းပါ'
          : packing
            ? 'ပို့ဆောင်သူ နီးကပ်လာပြီ — အော်ဒါ ပြင်ဆင်ပါ'
            : 'ပို့ဆောင်သူ နီးကပ်လာပြီ — လွှဲပြောင်းရန် ပြင်ဆင်ပါ',
      subtitle: `${hit.courierName} · #${hit.packageId.slice(-6)}`,
      metersLabel: `ခန့်မှန်း ${meters} မီတာ`,
    };
  }

  return {
    badge: hit.band === 'near' ? '120 米' : '300 米',
    title:
      hit.band === 'near'
        ? packing
          ? '骑手已到店附近，请尽快完成打包并交接'
          : '骑手已到店附近，请立即出面交接'
        : packing
          ? '骑手即将到店，请准备好包裹'
          : '骑手即将到店，请准备交接',
    subtitle: `${hit.courierName} · #${hit.packageId.slice(-6)}`,
    metersLabel: `约 ${meters} 米`,
  };
}

export function merchantRiderApproachSpeech(
  hit: MerchantRiderApproachHit,
  language: 'zh' | 'en' | 'my',
): { text: string; voiceLang: string } {
  const meters = String(Math.max(1, Math.round(hit.distanceMeters)));
  if (language === 'en') {
    return {
      text:
        hit.band === 'near'
          ? `Rider is about ${meters} meters away. Please hand over the order.`
          : `Rider is approaching, about ${meters} meters. Please get ready.`,
      voiceLang: 'en-US',
    };
  }
  if (language === 'my') {
    return {
      text:
        hit.band === 'near'
          ? `ပို့ဆောင်သူ ${meters} မီတာ အကွာတွင် ရှိပါသည်။ လွှဲပြောင်းပေးပါ။`
          : `ပို့ဆောင်သူ ${meters} မီတာ အကွာသို့ နီးကပ်လာပြီ။ ပြင်ဆင်ပါ။`,
      voiceLang: 'my-MM',
    };
  }
  return {
    text:
      hit.band === 'near'
        ? `骑手大约${meters}米，请立即交接`
        : `骑手即将到达，大约${meters}米，请准备交接`,
    voiceLang: 'zh-CN',
  };
}
