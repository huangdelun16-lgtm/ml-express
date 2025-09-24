// 缅甸时区 UTC+6:30
export const getMyanmarTime = (): Date => {
  const now = new Date();
  // 缅甸时间比UTC快6小时30分钟
  const myanmarOffset = 6.5 * 60; // 6.5小时转换为分钟
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const myanmarTime = new Date(utc + (myanmarOffset * 60000));
  return myanmarTime;
};

// 生成缅甸时间的订单号：MDY + 年月日时分 + 随机2位数字
export const generateOrderId = (): string => {
  const myanmarTime = getMyanmarTime();
  
  const year = myanmarTime.getFullYear();
  const month = String(myanmarTime.getMonth() + 1).padStart(2, '0');
  const day = String(myanmarTime.getDate()).padStart(2, '0');
  const hour = String(myanmarTime.getHours()).padStart(2, '0');
  const minute = String(myanmarTime.getMinutes()).padStart(2, '0');
  
  // 生成随机2位数字
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `MDY${year}${month}${day}${hour}${minute}${randomNum}`;
};

// 格式化缅甸时间显示
export const formatMyanmarTime = (date?: Date): string => {
  const myanmarTime = date || getMyanmarTime();
  return myanmarTime.toLocaleString('zh-CN', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 订单状态枚举
export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// 订单状态标签
export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '待接单',
  [OrderStatus.ACCEPTED]: '已接单',
  [OrderStatus.PICKED_UP]: '已取件',
  [OrderStatus.IN_TRANSIT]: '配送中',
  [OrderStatus.DELIVERED]: '已送达',
  [OrderStatus.CANCELLED]: '已取消',
};

// 计算距离（简化版本，实际应该使用地图API）
export const calculateDistance = (senderAddress: string, receiverAddress: string): number => {
  // 简化计算：基于地址关键词估算距离
  const senderCity = extractCity(senderAddress);
  const receiverCity = extractCity(receiverAddress);
  
  if (senderCity === receiverCity) {
    // 同城内随机5-15公里
    return Math.random() * 10 + 5;
  } else {
    // 跨城随机20-100公里
    return Math.random() * 80 + 20;
  }
};

// 提取城市名称
const extractCity = (address: string): string => {
  if (address.includes('仰光') || address.includes('Yangon')) return '仰光';
  if (address.includes('曼德勒') || address.includes('Mandalay')) return '曼德勒';
  if (address.includes('内比都') || address.includes('Naypyidaw')) return '内比都';
  return '其他';
};

// 计算订单价格
export const calculateOrderAmount = (distance: number, weight: number, packageType: string): number => {
  let basePrice = 5000; // 起步价 5000 MMK
  let pricePerKm = 1000; // 每公里 1000 MMK
  let pricePerKg = 500;  // 每公斤 500 MMK
  
  // 根据包裹类型调整价格
  switch (packageType) {
    case '电子产品':
      basePrice += 2000; // 贵重物品加收
      break;
    case '食品':
      pricePerKm += 200; // 保鲜要求加收
      break;
    case '文件':
      pricePerKg = 0; // 文件按距离计费
      break;
    default:
      break;
  }
  
  const distancePrice = distance * pricePerKm;
  const weightPrice = weight * pricePerKg;
  
  return Math.round(basePrice + distancePrice + weightPrice);
};

// 订单数据接口
export interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageType: string;
  weight: number;
  description: string;
  serviceType: string;
  distance: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery: string;
  notes?: string;
  // 快递员分配信息
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
}
