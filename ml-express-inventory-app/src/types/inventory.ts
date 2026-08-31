import type { CustomerSignReceipt } from './customerSignReceipt';

export type MovementType = 'in' | 'out' | 'adjust';

export interface InventoryItem {
  id: string;
  /** 确认入库时自动生成的条码（目的地+缅甸时间） */
  barcode: string;
  /** 快递单号（入库时扫码/手动填写） */
  input_barcode: string;
  name: string;
  spec: string;
  unit: string;
  weight: string;
  qty_on_hand: number;
  min_qty: number;
  note: string;
  /** 入库登记站店铺代码（如 MUSE001、YGN002）；空表示历史数据 */
  owner_store_code?: string;
  /** 入库登记的收件人姓名（商品表持久化，列表优先展示） */
  recipient_name?: string;
  /** 列表展示用客户名（查询时由 recipient_name 或入库流水填充） */
  customer_name?: string;
  /** 最终目的地（入库收发信息登记，如 YGN、MDY） */
  final_destination?: string;
  /** 列表展示用，同 final_destination */
  destination?: string;
  /** 中转到站收货时间（本站确认后写入） */
    hub_arrived_at?: string;
  /** 目的站通知客户取件时间 */
  arrival_notified_at?: string;
  /** 客户签收时间（目的站交付） */
  customer_signed_at?: string;
  /** 签收登记电话 */
  customer_sign_phone?: string;
  /** 签收方式 self | proxy */
  customer_sign_pickup_type?: string;
  /** 代收人姓名 */
  customer_sign_proxy_name?: string;
  /** 手写签名 JSON */
  customer_signature_data?: string;
  /** 执行签收操作员 */
  customer_signed_by_operator?: string;
  /** 打包入快递包时间（持久化，避免同步清掉关联表后状态丢失） */
  packed_at?: string;
  /** 所属快递包包装号 */
  packed_bundle_barcode?: string;
  /** 中转站释放待转出时间（本站重新打包发往下一站） */
  hub_transit_released_at?: string;
  /** 中转站装车发往下一站时间（与发站打包出库后展示一致） */
  hub_transit_shipped_at?: string;
  created_at: string;
  updated_at: string;
}

/** 商品库列表行（含入库 / 打包状态） */
export interface InventoryItemListRow extends InventoryItem {
  stocked_in: boolean;
  packed: boolean;
  hub_arrived: boolean;
  hub_transit_released: boolean;
  hub_transit_shipped: boolean;
  /** 经本站中转：已在本站「入库」登记（中转站到站流水） */
  hub_transit_hub_inbound?: boolean;
  customer_signed: boolean;
  /** 所属快递包包装号（已打包时由列表查询填充） */
  parent_pack_barcode?: string;
  /** 多个入库包内序号，如 3-1（总件数-当前序号） */
  pack_item_label?: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  barcode: string;
  item_name: string;
  type: MovementType;
  qty: number;
  qty_before: number;
  qty_after: number;
  operator: string;
  note: string;
  recipient_name: string;
  recipient_phone: string;
  /** 跨境登记客户编码 */
  customer_code?: string;
  destination: string;
  /** 收件详细地址（与目的地地区码分开存储） */
  detail_address: string;
  packaging: string;
  input_barcode: string;
  origin_store_id: string;
  origin_store_code: string;
  origin_store_name: string;
  created_at: string;
}

export interface PackedShipment {
  id: string;
  bundle_item_id: string;
  bundle_barcode: string;
  bundle_name: string;
  operator: string;
  note: string;
  /** 打包操作站店铺代码 */
  owner_store_code: string;
  /** 装车出库登记的车费（MMK） */
  transport_fee?: string;
  /** 装车本段运达站 */
  truck_leg_destination?: string;
  created_at: string;
}

export interface PackedShipmentItem {
  id: string;
  pack_id: string;
  item_id: string;
  item_barcode: string;
  /** 入库时填写的快递单号 */
  input_barcode: string;
  item_name: string;
  /** 订单最终目的地（来自入库流水） */
  destination: string;
  /** 收件人 / 客户姓名（来自入库流水） */
  customer_name: string;
  /** 订单入库登记站店铺代码 */
  owner_store_code?: string;
  qty: number;
}

/** 已确认打包的快递包裹（含明细） */
export interface PackedShipmentDetail extends PackedShipment {
  spec: string;
  unit: string;
  weight: string;
  items: PackedShipmentItem[];
  /** 包裹库存（通常为 1）；0 表示已装车出库 */
  bundle_qty_on_hand: number;
  /** 是否已完成装车出库 */
  loaded: boolean;
}

/** 打包列表行（含云端在途状态） */
export interface PackedShipmentListRow extends PackedShipmentDetail {
  cloud_status: 'in_transit' | 'hub_received' | 'completed' | 'cancelled' | 'split_at_hub' | null;
  display_status: 'pending_load' | 'loaded' | 'arrived' | 'completed';
}

/** 装车出库追溯信息 */
export interface TruckLoadInfo {
  outboundDate: string;
  destination: string;
  operator: string;
  created_at: string;
}

/** 追踪快递查询结果 */
export interface TrackOrderResult {
  query: string;
  matchType: 'express' | 'inbound' | 'package';
  detail: InventoryItemDetail;
  /** 入库单所属 PKG（非包装号本身时） */
  parentPack: PackedShipmentDetail | null;
  truckLoad: TruckLoadInfo | null;
  recentMovements: StockMovement[];
}

/** 商品库订单详情（查看用） */
export interface InventoryItemDetail extends InventoryItem {
  recipient_phone: string;
  detail_address: string;
  packaging: string;
  inbound_qty: number;
  inbound_date_label: string;
  inbound_store_name: string;
  total_fee?: string;
  payment_label?: string;
  inbound_note?: string;
  /** 入库流水原始 note（含「 · 打包入 」等系统段，用于识别多个入库） */
  inbound_movement_note?: string;
  /** 签收留痕（已签收后展示） */
  sign_receipt?: CustomerSignReceipt;
  /** 若为打包生成的包裹，附带打包明细 */
  pack: PackedShipmentDetail | null;
}
