/**
 * 商家 App 业务 API 入口（向后兼容）。
 * 实现已拆到 ./merchantApi/*，请优先从具体模块导入新代码。
 */
export { supabase } from "./merchantApi/supabaseClient";
export type {
  User,
  Customer,
  DeliveryStore,
  Package,
  Product,
  ProductVariant,
  ProductPendingUpdate,
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
} from "./merchantApi/types";
export {
  isProductLiveApproved,
  hasPendingProductUpdate,
  productFormSource,
  productNeedsAdminReview,
  pickProductReviewSnapshot,
  buildPendingUpdateFromProduct,
  normalizePendingPayload,
  toDirectProductPatch,
} from "./merchantApi/types";

export { customerService } from "./merchantApi/customerService";
export { addressService } from "./merchantApi/addressService";
export { deliveryStoreService } from "./merchantApi/deliveryStoreService";
export { userNotificationService } from "./merchantApi/userNotificationService";
export { packageService } from "./merchantApi/packageService";
export { bannerService } from "./merchantApi/bannerService";
export { systemSettingsService } from "./merchantApi/systemSettingsService";
export { rechargeService } from "./merchantApi/rechargeService";
export { merchantService } from "./merchantApi/merchantService";
export { reviewService } from "./merchantApi/reviewService";
export { tutorialService } from "./merchantApi/tutorialService";
export { welcomeScreenService } from "./merchantApi/welcomeScreenService";
export { deliveryPhotoService } from "./merchantApi/deliveryPhotoService";
