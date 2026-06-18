import type { SystemSetting } from '../services/supabase';

export const CROSS_BORDER_PRICING_REGIONS = [
  { id: 'mandalay', name: '曼德勒', nameEn: 'Mandalay', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', nameEn: 'Pyin Oo Lwin', prefix: 'POL' },
  { id: 'yangon', name: '仰光', nameEn: 'Yangon', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', nameEn: 'Naypyidaw', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', nameEn: 'Taunggyi', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', nameEn: 'Lashio', prefix: 'LSO' },
  { id: 'muse', name: '木姐', nameEn: 'Muse', prefix: 'MUSE' },
] as const;

export type CrossBorderPricingFieldKey =
  | 'pricing.cross_border.base_fee'
  | 'pricing.cross_border.free_weight_kg'
  | 'pricing.cross_border.weight_surcharge'
  | 'pricing.cross_border.per_piece_fee';

export interface CrossBorderPricingFieldDef {
  key: CrossBorderPricingFieldKey;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  defaultValue: number;
  suffix: string;
  suffixEn?: string;
  helpText?: string;
  helpTextEn?: string;
}

export const CROSS_BORDER_PRICING_FIELDS: CrossBorderPricingFieldDef[] = [
  {
    key: 'pricing.cross_border.base_fee',
    label: '跨境起步价 (MMK)',
    labelEn: 'Cross-border base fee (MMK)',
    description: 'Inventory App 入库「费用计算」中总费用的基础部分，与同城跑腿计费独立。',
    descriptionEn:
      'Base part of inbound total fee in Inventory App (separate from local errand pricing).',
    defaultValue: 2000,
    suffix: 'MMK',
    helpText:
      'Inventory 入库总费用 = 本领区跨境起步价 × 重量(kg)（按订单「最终目的地」对应领区读取）',
    helpTextEn:
      'Inbound total = regional base fee × weight (kg), read by order final destination region.',
  },
  {
    key: 'pricing.cross_border.free_weight_kg',
    label: '免费重量 (kg)',
    labelEn: 'Free weight (kg)',
    description: '该重量以内仅收起步价，超出部分按每公斤附加费计费。',
    descriptionEn: 'Within this weight only base fee applies; excess charged per kg.',
    defaultValue: 1,
    suffix: 'kg',
  },
  {
    key: 'pricing.cross_border.weight_surcharge',
    label: '超重每公斤费用 (MMK)',
    labelEn: 'Overweight fee per kg (MMK)',
    description: '超出免费重量后，每公斤增加的跨境物流费用。',
    descriptionEn: 'Additional cross-border fee per kg above free weight.',
    defaultValue: 200,
    suffix: 'MMK/公斤',
    suffixEn: 'MMK/kg',
  },
  {
    key: 'pricing.cross_border.per_piece_fee',
    label: '每件附加费 (MMK)',
    labelEn: 'Per-piece surcharge (MMK)',
    description: '同一入库单中，第 2 件起每件额外收取的费用（第 1 件不计）。',
    descriptionEn: 'Extra fee per item from the 2nd item in the same inbound order.',
    defaultValue: 0,
    suffix: 'MMK/件',
    suffixEn: 'MMK/item',
  },
];

export function defaultCrossBorderPricingValues(): Record<CrossBorderPricingFieldKey, number> {
  const initial = {} as Record<CrossBorderPricingFieldKey, number>;
  for (const def of CROSS_BORDER_PRICING_FIELDS) {
    initial[def.key] = def.defaultValue;
  }
  return initial;
}

export function mergeCrossBorderSettingsFromDb(
  incoming: SystemSetting[],
  selectedRegion: string,
): Record<CrossBorderPricingFieldKey, number> {
  const defaults = defaultCrossBorderPricingValues();
  const merged = { ...defaults };

  incoming.forEach((setting) => {
    const parts = setting.settings_key.split('.');
    if (parts.length === 4 && parts[0] === 'pricing' && parts[2] === 'cross_border') {
      if (parts[1] !== selectedRegion) return;
      const key = `pricing.cross_border.${parts[3]}` as CrossBorderPricingFieldKey;
      if (key in defaults) {
        const numeric = Number(setting.settings_value);
        if (Number.isFinite(numeric)) merged[key] = numeric;
      }
    } else if (parts.length === 3 && parts[0] === 'pricing' && parts[1] === 'cross_border') {
      const key = `pricing.cross_border.${parts[2]}` as CrossBorderPricingFieldKey;
      if (key in defaults && merged[key] === defaults[key]) {
        const numeric = Number(setting.settings_value);
        if (Number.isFinite(numeric)) merged[key] = numeric;
      }
    }
  });

  return merged;
}

export function buildCrossBorderPricingPayload(
  values: Record<CrossBorderPricingFieldKey, number>,
  selectedRegion: string,
): Array<Omit<SystemSetting, 'id'>> {
  return CROSS_BORDER_PRICING_FIELDS.map((def) => {
    const field = def.key.replace('pricing.cross_border.', '');
    return {
      category: 'pricing',
      settings_key: `pricing.${selectedRegion}.cross_border.${field}`,
      settings_value: values[def.key],
      description: def.description,
      updated_by: 'admin-dashboard',
    };
  });
}

export function regionDisplayName(regionId: string, isEn = false): string {
  const region = CROSS_BORDER_PRICING_REGIONS.find((r) => r.id === regionId);
  if (!region) return regionId;
  return isEn ? region.nameEn : region.name;
}
