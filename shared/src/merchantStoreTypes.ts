/** 合伙店铺 / 同城商场 — 店铺类型（与商家入驻申请一致） */

export type MerchantStoreTypeId =
  | 'restaurant'
  | 'drinks_snacks'
  | 'breakfast'
  | 'cake_shop'
  | 'tea_shop'
  | 'flower_shop'
  | 'clothing_store'
  | 'grocery'
  | 'supermarket'
  | 'other';

export type StoreTypeLang = 'zh' | 'en' | 'my';

export interface MerchantStoreTypeOption {
  value: MerchantStoreTypeId;
  zh: string;
  en: string;
  my: string;
}

/** 可选店铺类型（新建/筛选；不含五金店） */
export const MERCHANT_STORE_TYPE_OPTIONS: MerchantStoreTypeOption[] = [
  { value: 'restaurant', zh: '餐厅', en: 'Restaurant', my: 'စားသောက်ဆိုင်' },
  { value: 'drinks_snacks', zh: '饮料和小吃', en: 'Drink & Snack', my: 'Drink & Snack' },
  { value: 'breakfast', zh: '早点铺', en: 'Breakfast Shop', my: 'မနက်စာဆိုင်' },
  { value: 'cake_shop', zh: '蛋糕店', en: 'Cake Shop', my: 'ကိတ်မှုန့်ဆိုင်' },
  { value: 'tea_shop', zh: '茶铺', en: 'Tea Shop', my: 'လက်ဖက်ရည်ဆိုင်' },
  { value: 'flower_shop', zh: '花店', en: 'Flower Shop', my: 'ပန်းဆိုင်' },
  { value: 'clothing_store', zh: '服装店', en: 'Clothing Store', my: 'အ၀တ်ဆိုင်' },
  { value: 'grocery', zh: '杂货店', en: 'Store', my: 'ကုန်စုံဆိုင်' },
  { value: 'supermarket', zh: '百货店', en: 'Department Store', my: 'ကုန်တိုက်' },
  { value: 'other', zh: '网购', en: 'Online Shop', my: 'အွန်လိုင်းဆိုင်' },
];

export const MERCHANT_STORE_TYPE_VALUES: MerchantStoreTypeId[] = MERCHANT_STORE_TYPE_OPTIONS.map(
  (o) => o.value,
);

/** 历史/系统类型 — 仅用于展示，不可新建 */
const LEGACY_STORE_TYPE_LABELS: Record<string, Record<StoreTypeLang, string>> = {
  hardware_store: { zh: '五金店', en: 'Hardware', my: 'ဟာ့ဒ်ဝဲလ်ဆိုင်' },
  transit_station: { zh: '中转站', en: 'Transit Station', my: 'သယ်ယူပို့ဆောင်ရေးစခန်း' },
};

const CITY_MALL_CATEGORY_ICONS: Record<string, string> = {
  restaurant: 'restaurant-outline',
  drinks_snacks: 'fast-food-outline',
  breakfast: 'sunny-outline',
  cake_shop: 'heart-outline',
  tea_shop: 'cafe-outline',
  flower_shop: 'flower-outline',
  clothing_store: 'shirt-outline',
  grocery: 'cart-outline',
  supermarket: 'basket-outline',
  other: 'globe-outline',
};

export interface CityMallCategory {
  id: string;
  zh: string;
  en: string;
  my: string;
  icon: string;
}

/** 同城商场 category scroll（含「全部」） */
export const CITY_MALL_CATEGORIES: CityMallCategory[] = [
  { id: '全部', zh: '全部', en: 'All', my: 'အားလုံး', icon: 'grid-outline' },
  ...MERCHANT_STORE_TYPE_OPTIONS.map((o) => ({
    id: o.value,
    zh: o.zh,
    en: o.en,
    my: o.my,
    icon: CITY_MALL_CATEGORY_ICONS[o.value] ?? 'storefront-outline',
  })),
];

export function getMerchantStoreTypeLabel(type: string, lang: StoreTypeLang): string {
  const hit = MERCHANT_STORE_TYPE_OPTIONS.find((o) => o.value === type);
  if (hit) return hit[lang];
  const legacy = LEGACY_STORE_TYPE_LABELS[type];
  if (legacy) return legacy[lang];
  return type;
}

export function merchantStoreTypeLabelZh(type: string): string {
  return getMerchantStoreTypeLabel(type, 'zh');
}

export function buildMerchantStoreTypeLabelMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const o of MERCHANT_STORE_TYPE_OPTIONS) {
    map[o.value] = o.zh;
  }
  map.transit_station = LEGACY_STORE_TYPE_LABELS.transit_station.zh;
  map.hardware_store = LEGACY_STORE_TYPE_LABELS.hardware_store.zh;
  return map;
}
