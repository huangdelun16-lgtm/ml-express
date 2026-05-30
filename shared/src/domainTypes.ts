// 跨端共享的领域数据类型（多端共享单一源）
//
// 单一真源：/shared/src/domainTypes.ts
// 各 app 通过 sync 脚本复制到 _shared/ 后引用，请勿在副本中修改。
//
// 仅放各端**完全一致**的类型。差异较大的（如 DeliveryStore、User、Package、
// admin 的 RechargeRequest）保留在各 app 本地，未纳入此处。

/** 广告横幅 */
export interface Banner {
  id?: string;
  title: string;
  subtitle?: string;
  burmese_title?: string;
  image_url?: string;
  link_url?: string;
  bg_color_start?: string;
  bg_color_end?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** 教学步骤（多图支持） */
export interface Tutorial {
  id?: string;
  title_zh: string;
  title_en?: string;
  title_my?: string;
  content_zh: string;
  content_en?: string;
  content_my?: string;
  image_url?: string;
  image_urls?: string[];
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** 商品分类 */
export interface ProductCategory {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
}

/** 商店评价（含骑手配送评分 courier_rating 1-5） */
export interface StoreReview {
  id: string;
  store_id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  courier_rating?: number;
  comment: string;
  images: string[];
  reply_text?: string;
  replied_at?: string;
  is_anonymous: boolean;
  status: "pending" | "published" | "hidden";
  created_at?: string;
  updated_at?: string;
}

/**
 * 充值申请（客户端 / 商家 Web 共用形态：proof_url 必填、无额外字段）。
 * 注意：Admin 端的 RechargeRequest 形态不同（含 register_region / user_balance、
 * proof_url 可选），保留在 admin 本地，未纳入此处。
 */
export interface RechargeRequest {
  id?: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  proof_url: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** 常用地址（移动端地址簿） */
export interface AddressItem {
  id?: string;
  user_id: string;
  label: string;
  contact_name: string;
  contact_phone: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

/** 用户通知（移动端） */
export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: "system" | "order" | "promotion";
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

/** 欢迎页配置 */
export interface WelcomeScreen {
  id?: string;
  title_zh: string;
  title_en?: string;
  title_my?: string;
  description_zh: string;
  description_en?: string;
  description_my?: string;
  button_text_zh: string;
  button_text_en?: string;
  button_text_my?: string;
  image_url: string;
  bg_color_start?: string;
  bg_color_end?: string;
  button_color_start?: string;
  button_color_end?: string;
  countdown: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
