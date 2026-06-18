export type CrossBorderHub = {
  regionId: string;
  nameZh: string;
  nameEn: string;
  prefix: string;
  hubCode: string;
  lat: number;
  lng: number;
};

export const CROSS_BORDER_HUBS: CrossBorderHub[] = [
  { regionId: 'muse', nameZh: '木姐', nameEn: 'Muse', prefix: 'MUSE', hubCode: 'MSE', lat: 23.9833, lng: 97.9 },
  { regionId: 'mandalay', nameZh: '曼德勒', nameEn: 'Mandalay', prefix: 'MDY', hubCode: 'MDY', lat: 21.9588, lng: 96.0891 },
  { regionId: 'maymyo', nameZh: '彬乌伦', nameEn: 'Pyin Oo Lwin', prefix: 'POL', hubCode: 'POL', lat: 22.0333, lng: 96.4667 },
  { regionId: 'yangon', nameZh: '仰光', nameEn: 'Yangon', prefix: 'YGN', hubCode: 'YGN', lat: 16.8661, lng: 96.1951 },
  { regionId: 'naypyidaw', nameZh: '内比都', nameEn: 'Naypyidaw', prefix: 'NPW', hubCode: 'NPW', lat: 19.7633, lng: 96.0785 },
  { regionId: 'taunggyi', nameZh: '东枝', nameEn: 'Taunggyi', prefix: 'TGI', hubCode: 'TGI', lat: 20.7892, lng: 97.0378 },
  { regionId: 'lashio', nameZh: '腊戌', nameEn: 'Lashio', prefix: 'LSO', hubCode: 'LSO', lat: 22.9333, lng: 97.75 },
];

export const DEFAULT_OPERATING_HOURS = '08:00 - 22:00';
export const DEFAULT_CONTACT_PHONE = '09788848928';

export function formatCrossBorderRegionLabel(hub: CrossBorderHub, isEn = false): string {
  return isEn ? `${hub.nameEn} (${hub.prefix})` : `${hub.nameZh}（${hub.prefix}）`;
}

export function generateInventoryPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export type TransitStoreRef = { region?: string; store_code?: string };

export function buildCrossBorderAccountDraft(
  regionId: string,
  existingStores: TransitStoreRef[],
  isEn = false,
) {
  const hub =
    CROSS_BORDER_HUBS.find((h) => h.regionId === regionId) ?? CROSS_BORDER_HUBS[1];
  const regionStores = existingStores.filter(
    (s) =>
      s.region === regionId ||
      (s.store_code && s.store_code.toUpperCase().startsWith(hub.prefix)),
  );
  const nextNumber = (regionStores.length + 1).toString().padStart(3, '0');
  const store_code = `${hub.prefix}${nextNumber}`;
  const hubName = isEn ? hub.nameEn : hub.nameZh;

  return {
    store_name: isEn ? `${hub.nameEn} Cross-border Hub` : `${hub.nameZh}跨境中转站`,
    store_code,
    region: hub.regionId,
    hubCode: hub.hubCode,
    address: isEn
      ? `${hub.nameEn} · Market Link cross-border transit hub`
      : `${hub.nameZh} · Market Link 跨境物流中转站`,
    latitude: hub.lat,
    longitude: hub.lng,
    phone: DEFAULT_CONTACT_PHONE,
    email: 'marketlink982@gmail.com',
    manager_name: isEn ? 'Hub manager' : '站点负责人',
    manager_phone: DEFAULT_CONTACT_PHONE,
    operating_hours: DEFAULT_OPERATING_HOURS,
    password: generateInventoryPassword(),
    notes: isEn
      ? 'Inventory App cross-border account (created from Admin console)'
      : 'Inventory App 跨境物流账号（由 Admin 跨境物流控制台创建）',
    service_area_radius: 5,
    capacity: 5000,
    facilities: ['storage'] as string[],
    cod_settlement_day: '7' as '7',
  };
}
