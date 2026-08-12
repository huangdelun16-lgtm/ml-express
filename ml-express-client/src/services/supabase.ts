/**
 * 会员 App 业务 API 入口（向后兼容）。
 * 实现已拆到 ./clientApi/*，请优先从具体模块导入新代码。
 */
export { supabase } from './clientApi/supabaseClient';
export type {
  User,
  Customer,
  DeliveryStore,
  Package,
  ProductVariant,
  Product,
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
} from './clientApi/types';

export { customerService } from './clientApi/customerService';
export { addressService } from './clientApi/addressService';
export { deliveryStoreService } from './clientApi/deliveryStoreService';
export { userNotificationService } from './clientApi/userNotificationService';
export { packageService } from './clientApi/packageService';
export { bannerService } from './clientApi/bannerService';
export { systemSettingsService } from './clientApi/systemSettingsService';
export { rechargeService } from './clientApi/rechargeService';
export {
  CLIENT_RECHARGE_QR_SETTING_KEY,
  RECHARGE_QR_AMOUNT_TIERS,
  getDefaultRechargeQrUrlMap,
  fetchRechargeQrUrlMap,
} from './clientApi/rechargeQr';
export { merchantService } from './clientApi/merchantService';
export { reviewService } from './clientApi/reviewService';
export { tutorialService } from './clientApi/tutorialService';
export { welcomeScreenService } from './clientApi/welcomeScreenService';
export { deliveryPhotoService } from './clientApi/deliveryPhotoService';
