import type {
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
} from "../_shared/domainTypes";
import type {
  Product,
  ProductVariant,
  ProductPendingUpdate,
} from "../_shared/productReview";
import {
  isProductLiveApproved,
  hasPendingProductUpdate,
  productFormSource,
  productNeedsAdminReview,
  pickProductReviewSnapshot,
  buildPendingUpdateFromProduct,
  normalizePendingPayload,
  toDirectProductPatch,
} from "../_shared/productReview";

export type {
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
  Product,
  ProductVariant,
  ProductPendingUpdate,
};

export {
  isProductLiveApproved,
  hasPendingProductUpdate,
  productFormSource,
  productNeedsAdminReview,
  pickProductReviewSnapshot,
  buildPendingUpdateFromProduct,
  normalizePendingPayload,
  toDirectProductPatch,
};

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: "customer" | "courier" | "admin";
  status: "active" | "inactive" | "suspended";
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  balance?: number;
  rating: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer extends User {}

export interface DeliveryStore {
  id: string;
  store_name: string;
  store_code?: string;
  address: string;
  phone: string;
  manager_phone?: string;
  store_type: string;
  status: string;
  operating_hours?: string;
  is_closed_today?: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  vacation_dates?: string[];
  cod_settlement_day?: "7" | "10" | "15" | "30";
}

export interface Package {
  id: string;
  customer_id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude?: number;
  sender_longitude?: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude?: number;
  receiver_longitude?: number;
  package_type: string;
  weight: string;
  description?: string;
  price: string;
  status: string;
  courier?: string;
  delivery_speed?: string;
  scheduled_delivery_time?: string;
  qr_code?: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
  delivery_distance?: number;
  customer_rating?: number;
  customer_comment?: string;
  rating_time?: string;
  payment_method?: "qr" | "cash";
  cod_amount?: number;
  delivery_store_id?: string;
  pricing_base_fee_mmk?: number | null;
}
