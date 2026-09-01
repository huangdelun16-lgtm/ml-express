import type {
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
} from '../_shared/domainTypes';

export type {
  Banner,
  Tutorial,
  ProductCategory,
  StoreReview,
  AddressItem,
  UserNotification,
  WelcomeScreen,
};

// 用户接口（与Web端users表对应）
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: 'customer' | 'courier' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  balance?: number; // 🚀 新增：账户余额
  rating: number;
  notes: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// 客户接口（兼容旧代码）
export interface Customer extends User {}

// 商店接口
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
  vacation_dates?: string[]; // 🚀 新增：休假日期列表 (YYYY-MM-DD)
  cod_settlement_day?: '7' | '10' | '15' | '30'; // 🚀 新增：COD 结清日
  avatar_url?: string | null;
}

// 包裹接口
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
  /** 骑手配送服务评分 1-5，与 store_reviews.courier_rating 同步 */
  courier_service_rating?: number;
  rating_time?: string;
  payment_method?: 'qr' | 'cash'; // 支付方式：qr=二维码支付，cash=现金支付
  cod_amount?: number; // 代收款金额
  delivery_store_id?: string; // 🚀 新增：配送店ID
  pricing_base_fee_mmk?: number | null;
}

// Banner/Tutorial/StoreReview/AddressItem/UserNotification/WelcomeScreen 已抽到 /shared/src/domainTypes.ts（见顶部 import）

// 商品接口
export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  stock: number;
  is_available?: boolean;
  sort_order?: number;
};

export interface Product {
  id: string;
  store_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  /** 商品详细介绍滚动图（纵向浏览） */
  detail_image_urls?: string[];
  /** 多规格 SKU；null 表示单一价格商品 */
  variants?: ProductVariant[] | null;
  stock: number;
  is_available: boolean;
  sales_count: number;
  /** pending=待审 approved=已上架 rejected=已拒绝 */
  listing_status?: 'pending' | 'approved' | 'rejected' | null;
  created_at?: string;
  updated_at?: string;
}
