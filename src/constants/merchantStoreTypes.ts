/** 与 /shared/src/merchantStoreTypes.ts 保持同步（通过 npm run sync:shared） */

export {
  MERCHANT_STORE_TYPE_OPTIONS,
  MERCHANT_STORE_TYPE_VALUES,
  CITY_MALL_CATEGORIES,
  getMerchantStoreTypeLabel,
  merchantStoreTypeLabelZh,
  buildMerchantStoreTypeLabelMap,
} from '../services/_shared/merchantStoreTypes';

export type {
  MerchantStoreTypeId,
  MerchantStoreTypeOption,
  StoreTypeLang,
  CityMallCategory,
} from '../services/_shared/merchantStoreTypes';
