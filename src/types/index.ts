/**
 * 全局类型定义
 * 统一管理所有类型定义，提升类型安全和代码复用
 */

// ==================== 基础类型 ====================

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ==================== 用户相关 ====================

/**
 * 用户类型
 */
export type UserType = 'customer' | 'courier' | 'admin';

/**
 * 用户状态
 */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * 用户接口
 */
export interface User extends BaseEntity {
  name: string;
  phone: string;
  email: string;
  address: string;
  user_type: UserType;
  status: UserStatus;
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  rating: number;
  notes?: string;
}

// ==================== 包裹相关 ====================

/**
 * 包裹状态
 */
export type PackageStatus = 
  | '待取件' 
  | '已取件' 
  | '配送中' 
  | '已送达' 
  | '已取消';

/**
 * 配送速度
 */
export type DeliverySpeed = '标准达' | '准时达' | '加急配送';

/**
 * 包裹类型
 */
export type PackageType = 
  | '标准件（45x60x15cm）和（5KG）以内'
  | '超规件（50x70x30cm）和（10KG）以内'
  | '易碎品'
  | '食品饮料';

/**
 * 包裹接口
 */
export interface Package extends BaseEntity {
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_latitude: number;
  sender_longitude: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_latitude: number;
  receiver_longitude: number;
  package_type: PackageType;
  weight?: string;
  price: string;
  delivery_speed: DeliverySpeed;
  delivery_distance: number;
  courier: string;
  status: PackageStatus;
  pickup_time?: string;
  delivery_time?: string;
  scheduled_delivery_time?: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_rating?: number;
  customer_comment?: string;
  rating_time?: string;
  delivery_store_id?: string;
  delivery_store_name?: string;
  region?: string;
  is_settled: boolean;
}

// ==================== 快递员相关 ====================

/**
 * 车辆类型
 */
export type VehicleType = 'motorcycle' | 'car' | 'bicycle' | 'truck' | 'tricycle' | 'small_truck';

/**
 * 快递员状态
 */
export type CourierStatus = 'online' | 'offline' | 'active' | 'inactive' | 'busy';

/**
 * 快递员接口
 */
export interface Courier extends BaseEntity {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicle_type?: VehicleType;
  license_number?: string;
  status: CourierStatus;
  join_date?: string;
  last_active?: string;
  total_deliveries?: number;
  rating?: number;
  notes?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  role?: 'operator' | 'manager' | 'admin' | 'finance' | 'rider';
  region?: 'yangon' | 'mandalay';
}

/**
 * 快递员位置接口
 */
export interface CourierLocation extends BaseEntity {
  courier_id: string;
  latitude: number;
  longitude: number;
  status: CourierStatus;
  battery_level?: number;
  last_update: string;
}

/**
 * 带位置的快递员接口
 */
export interface CourierWithLocation extends Courier {
  location?: CourierLocation;
  latitude?: number;
  longitude?: number;
  currentPackages?: number;
  todayDeliveries?: number;
  batteryLevel?: number;
}

// ==================== 账户管理相关 ====================

/**
 * 管理员角色
 */
export type AdminRole = 'admin' | 'manager' | 'operator' | 'finance';

/**
 * 账户状态
 */
export type AccountStatus = 'active' | 'inactive' | 'suspended';

/**
 * 管理员账户接口
 */
export interface AdminAccount extends BaseEntity {
  username: string;
  password: string;
  employee_name: string;
  employee_id: string;
  department?: string;
  position?: string;
  role: AdminRole;
  phone?: string;
  email?: string;
  status: AccountStatus;
  last_login?: string;
  cv_url?: string;
}

// ==================== 审计日志相关 ====================

/**
 * 操作类型
 */
export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout'
  | 'view'
  | 'export';

/**
 * 审计日志接口
 */
export interface AuditLog extends BaseEntity {
  user_id: string;
  user_name: string;
  action_type: ActionType;
  module: string;
  action_description: string;
  target_id?: string;
  target_type?: string;
  old_value?: string;
  new_value?: string;
}

// ==================== 财务相关 ====================

/**
 * 财务记录类型
 */
export type FinanceRecordType = 'revenue' | 'expense';

/**
 * 财务记录状态
 */
export type FinanceRecordStatus = 'confirmed' | 'pending' | 'cancelled';

/**
 * 财务记录接口
 */
export interface FinanceRecord extends BaseEntity {
  record_type: FinanceRecordType;
  category: string;
  amount: number;
  currency: string;
  status: FinanceRecordStatus;
  order_id?: string;
  courier_id?: string;
  record_date: string;
  notes?: string;
}

// ==================== 配送商店相关 ====================

/**
 * 商店状态
 */
export type StoreStatus = 'active' | 'inactive' | 'maintenance';

/**
 * 配送商店接口
 */
export interface DeliveryStore extends BaseEntity {
  store_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  manager_name?: string;
  capacity?: number;
  status: StoreStatus;
}

// ==================== 通知相关 ====================

/**
 * 通知接收者类型
 */
export type NotificationRecipientType = 'courier' | 'customer' | 'admin';

/**
 * 通知类型
 */
export type NotificationType = 'package_assigned' | 'status_update' | 'urgent' | 'system';

/**
 * 通知接口
 */
export interface Notification extends BaseEntity {
  recipient_id: string;
  recipient_type: NotificationRecipientType;
  notification_type: NotificationType;
  title: string;
  message: string;
  package_id?: string;
  is_read: boolean;
  read_at?: string;
  metadata?: Record<string, unknown>;
}

// ==================== 警报相关 ====================

/**
 * 警报严重程度
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 警报状态
 */
export type AlertStatus = 'pending' | 'resolved' | 'dismissed';

/**
 * 配送警报接口
 */
export interface DeliveryAlert extends BaseEntity {
  package_id: string;
  courier_id: string;
  courier_name: string;
  alert_type: string;
  severity: AlertSeverity;
  courier_latitude: number;
  courier_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  distance_from_destination?: number;
  title: string;
  description: string;
  action_attempted?: string;
  status: AlertStatus;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  violation_type?: string;
  penalty_points?: number;
  warning_level?: string;
  admin_action?: string;
  metadata?: Record<string, unknown>;
}

// ==================== 配送照片相关 ====================

/**
 * 配送照片接口
 */
export interface DeliveryPhoto extends BaseEntity {
  package_id: string;
  photo_url?: string;
  photo_base64?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  upload_time: string;
  courier_id?: string;
  courier_name?: string;
}

// ==================== 地图相关 ====================

/**
 * 坐标接口
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 地图中心点配置
 */
export interface MapCenter {
  lat: number;
  lng: number;
}

/**
 * POI信息
 */
export interface POI {
  name: string;
  types: string[];
  place_id?: string;
}

// ==================== 分页和筛选 ====================

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 通用筛选参数
 */
export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

// ==================== 表单相关 ====================

/**
 * 表单字段类型
 */
export type FormFieldType = 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'date' | 'checkbox' | 'radio';

/**
 * 表单验证规则
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * 表单字段配置
 */
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  validation?: ValidationRule;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: any;
}

// ==================== 类型导出说明 ====================
// 所有类型和接口已经通过 export interface 和 export type 直接导出
// 无需再次导出，避免重复导出错误

