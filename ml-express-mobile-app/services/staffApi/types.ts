// 包裹数据类型
export interface Package {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_type: string;
  weight: string;
  description?: string;
  status: string;
  create_time: string;
  pickup_time: string;
  delivery_time: string;
  courier: string;
  price: string;
  created_at?: string;
  updated_at?: string;
  // 新增店铺相关字段
  delivery_store_id?: string;
  delivery_store_name?: string;
  store_receive_code?: string;
  sender_code?: string; // 寄件码（客户提交订单后自动生成的二维码）
  transfer_code?: string; // 中转码（包裹在中转站的唯一标识码）
  // 新增坐标字段
  receiver_latitude?: number; // 收件人纬度
  receiver_longitude?: number; // 收件人经度
  sender_latitude?: number; // 发件人纬度
  sender_longitude?: number; // 发件人经度
  // 新增配送相关字段
  delivery_speed?: string; // 配送速度
  scheduled_delivery_time?: string; // 定时配送时间
  // 新增支付方式字段
  payment_method?: 'qr' | 'cash'; // 支付方式：qr=二维码支付，cash=现金支付
  cod_amount?: number; // 代收款金额 (COD)
  rider_settled?: boolean; // 骑手是否已结清
  rider_settled_at?: string; // 骑手结清时间
  pricing_base_fee_mmk?: number | null;
  // 费用明细字段
  store_fee?: string | number; // 待付款（店铺填写）
  delivery_fee?: string | number; // 跑腿费（客户下单时系统自动生成的费用）
  delivery_distance?: number; // 配送距离 (KM)
}

export interface AdminAccount {
  id?: string;
  username: string;
  password?: string;
  employee_name: string;
  employee_id: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  role: 'admin' | 'manager' | 'operator' | 'finance';
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  /** 员工所属领区，用于骑手端拉取对应计费规则 */
  region?: string;
  avatar_url?: string | null;
}

export interface AuditLog {
  user_id: string;
  user_name: string;
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: 'packages' | 'users' | 'couriers' | 'finance' | 'settings' | 'system';
  target_id?: string;
  target_name?: string;
  action_description: string;
  old_value?: string;
  new_value?: string;
}

// 快递员数据类型
export interface Courier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicle_type: string;
  license_number?: string;
  status: 'active' | 'inactive' | 'busy';
  join_date?: string;
  last_active?: string;
  total_deliveries?: number;
  rating?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
  avatar_url?: string | null;
}

// 路线优化结果
export interface RouteOptimization {
  courier_id: string;
  courier_name: string;
  packages: Package[];
  total_distance: number;
  estimated_time: number;
  priority_score: number;
}

// 快递店数据类型
export interface DeliveryStore {
  id: string;
  store_name: string;
  manager_name: string;
  manager_phone: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  vacation_dates?: string[]; // 🚀 新增：休假日期列表 (YYYY-MM-DD)
  cod_settlement_day?: '7' | '10' | '15' | '30'; // 🚀 新增：COD 结清日
}


// 通知接口
export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'courier' | 'customer' | 'admin';
  notification_type: 'package_assigned' | 'status_update' | 'urgent' | 'system';
  title: string;
  message: string;
  package_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  metadata?: any;
}

