import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import NotificationService from '../notificationService';
import { errorService } from '../ErrorService';
import { retry } from '../../utils/retry';
import {
  buildCustomerPhoneOrFilter,
  mergePackageRows,
} from '../_shared/customerPackageQuery';

const EMPTY_ORDER_STATS = {
  total: 0,
  pending: 0,
  inTransit: 0,
  delivered: 0,
  cancelled: 0,
  pendingPay: 0,
  pendingAccept: 0,
  awaitingDelivery: 0,
  delivering: 0,
  afterSale: 0,
  deliveredIds: [] as string[],
};

function computeOrderStats(rows: Array<{ id?: string; status?: string }>) {
  return {
    total: rows.length,
    pending: rows.filter((p) => ['待确认', '待取件', '待收款'].includes(p.status || '')).length,
    inTransit: rows.filter((p) => ['已取件', '配送中'].includes(p.status || '')).length,
    delivered: rows.filter((p) => p.status === '已送达' || p.status === '已完成').length,
    cancelled: rows.filter((p) => p.status === '已取消').length,
    pendingPay: rows.filter((p) => p.status === '待收款').length,
    pendingAccept: rows.filter((p) => p.status === '待确认').length,
    awaitingDelivery: rows.filter((p) => ['待确认', '打包中', '待取件'].includes(p.status || '')).length,
    delivering: rows.filter((p) => ['已取件', '配送中'].includes(p.status || '')).length,
    afterSale: rows.filter((p) => ['已取消', '异常上报'].includes(p.status || '')).length,
    deliveredIds: rows.filter((p) => p.status === '已送达' || p.status === '已完成').map((p) => p.id).filter(Boolean) as string[],
  };
}

/**
 * Split matching into parameterized filters. Never put email / description
 * brackets / phone "+" into a single PostgREST `.or()` string.
 */
async function fetchCustomerPackages(opts: {
  userId: string;
  email?: string;
  phone?: string;
  columns: string;
  status?: string;
}): Promise<any[]> {
  const { userId, email, phone, columns, status } = opts;
  const applyStatus = (query: any) => {
    if (status && status !== 'all') return query.eq('status', status);
    return query;
  };

  const runSelect = () => applyStatus(supabase.from('packages').select(columns));

  const tasks: Array<Promise<any[]>> = [];

  if (userId) {
    tasks.push(
      runSelect()
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: any[] | null; error: any }) => {
          if (error) {
            const message = String(error.message || '');
            if (!(message.includes('customer_id') && message.includes('does not exist'))) {
              LoggerService.error('按 customer_id 查询订单失败:', error);
            }
            return [];
          }
          return data || [];
        })
        .catch((error: any) => {
          LoggerService.error('按 customer_id 查询订单失败:', error);
          return [];
        }),
    );

    tasks.push(
      runSelect()
        .ilike('description', `%[客户ID: ${userId}]%`)
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: any[] | null; error: any }) => {
          if (error) {
            LoggerService.error('按 description 查询订单失败:', error);
            return [];
          }
          return data || [];
        })
        .catch((error: any) => {
          LoggerService.error('按 description 查询订单失败:', error);
          return [];
        }),
    );
  }

  const emailVal = String(email || '').trim();
  if (emailVal) {
    tasks.push(
      runSelect()
        .eq('customer_email', emailVal)
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: any[] | null; error: any }) => {
          if (error) {
            const message = String(error.message || '');
            if (!message.includes('customer_email')) {
              LoggerService.error('按 customer_email 查询订单失败:', error);
            }
            return [];
          }
          return data || [];
        })
        .catch((error: any) => {
          LoggerService.error('按 customer_email 查询订单失败:', error);
          return [];
        }),
    );
  }

  const phoneFilter = buildCustomerPhoneOrFilter(phone);
  if (phoneFilter) {
    tasks.push(
      runSelect()
        .or(phoneFilter)
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: any[] | null; error: any }) => {
          if (error) {
            LoggerService.error('按电话查询订单失败:', error);
            return [];
          }
          return data || [];
        })
        .catch((error: any) => {
          LoggerService.error('按电话查询订单失败:', error);
          return [];
        }),
    );
  }

  if (!tasks.length) return [];
  const batches = await Promise.all(tasks);
  return mergePackageRows(batches);
}

export const packageService = {
  // 创建订单
  async createOrder(packageData: {
    customer_id: string;
    sender_name: string;
    sender_phone: string;
    sender_address: string;
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    package_type: string;
    weight: string;
    description?: string;
    price: string;
    delivery_speed?: string;
    scheduled_delivery_time?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .insert([{
          ...packageData,
          status: '待取件',
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 更新用户订单统计
      const { data: user } = await supabase
        .from('users')
        .select('total_orders, total_spent')
        .eq('id', packageData.customer_id)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({
            total_orders: (user.total_orders || 0) + 1,
            total_spent: (user.total_spent || 0) + parseFloat(packageData.price || '0')
          })
          .eq('id', packageData.customer_id);
      }

      return { success: true, data };
    } catch (error) {
      const appError = errorService.handleError(error, { context: 'packageService.createOrder', silent: true });
      return { success: false, error: appError };
    }
  },

  // createPackage 别名（为了兼容性，接受完整的包裹数据）
  async createPackage(packageData: any) {
    try {
      // LoggerService.debug('开始创建订单，数据：', packageData); // 使用统一日志服务后可移除

      // 提取需要的字段并添加默认值
      // 注意：packages表没有customer_id字段，我们将客户ID添加到description中
      const customerNote = packageData.customer_id ? `[客户ID: ${packageData.customer_id}]` : '';
      const fullDescription = `${customerNote} ${packageData.description || ''}`.trim();

      const insertData: any = {
        // 添加 customer_id 和 customer_email (需先运行数据库迁移脚本)
        customer_id: packageData.customer_id,
        customer_email: packageData.customer_email,
        sender_name: packageData.sender_name,
        sender_phone: packageData.sender_phone,
        sender_address: packageData.sender_address,
        sender_latitude: packageData.sender_latitude,
        sender_longitude: packageData.sender_longitude,
        receiver_name: packageData.receiver_name,
        receiver_phone: packageData.receiver_phone,
        receiver_address: packageData.receiver_address,
        receiver_latitude: packageData.receiver_latitude,
        receiver_longitude: packageData.receiver_longitude,
        package_type: packageData.package_type,
        weight: packageData.weight,
        description: fullDescription, // 将客户ID包含在描述中 (保留用于兼容旧数据)
        price: String(packageData.price || '0'), // 确保是字符串
        delivery_speed: packageData.delivery_speed || '准时达',
        scheduled_delivery_time: packageData.scheduled_delivery_time || null,
        delivery_distance: packageData.delivery_distance || 0,
        status: packageData.status || '待取件',
        delivery_store_id: packageData.delivery_store_id || null, // 🚀 新增：保存配送店ID
        create_time: packageData.create_time || new Date().toLocaleString('zh-CN'),
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        payment_method: packageData.payment_method || 'cash', // 添加支付方式
        cod_amount: packageData.cod_amount || 0, // 添加代收款
        pricing_base_fee_mmk:
          packageData.pricing_base_fee_mmk != null &&
          !Number.isNaN(Number(packageData.pricing_base_fee_mmk))
            ? Number(packageData.pricing_base_fee_mmk)
            : null,
      };

      // 如果提供了自定义ID，使用它
      if (packageData.id) {
        insertData.id = packageData.id;
      }

      // LoggerService.debug('准备插入数据库的数据：', insertData);

      const { data, error } = await supabase
        .from('packages')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // LoggerService.debug('订单创建成功：', data);
      
      // 更新用户订单统计（如果提供了customer_id）
      if (packageData.customer_id) {
        try {
          const { data: user } = await supabase
            .from('users')
            .select('total_orders, total_spent')
            .eq('id', packageData.customer_id)
            .single();

          if (user) {
            await supabase
              .from('users')
              .update({
                total_orders: (user.total_orders || 0) + 1,
                total_spent: (user.total_spent || 0) + parseFloat(packageData.price || '0')
              })
              .eq('id', packageData.customer_id);
          }
        } catch (updateError) {
          // 统计更新失败不影响订单创建，仅记录
          errorService.handleError(updateError, { context: 'createPackage.updateStats', silent: true });
        }
      }

      // 发送订单创建通知
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.sendOrderUpdateNotification({
          orderId: data.id,
          status: '待取件',
          customerName: packageData.sender_name,
          customerPhone: packageData.sender_phone,
        });
      } catch (notificationError) {
        errorService.handleError(notificationError, { context: 'createPackage.sendNotification', silent: true });
      }

      return { success: true, data };
    } catch (error: any) {
      const appError = errorService.handleError(error, { context: 'packageService.createPackage', silent: true });
      return { 
        success: false, 
        error: appError 
      };
    }
  },

  // 获取客户的所有订单（通过description中的客户ID匹配）
  async getCustomerOrders(customerId: string) {
    return retry(async () => {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .ilike('description', `%[客户ID: ${customerId}]%`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        throw error; // 抛出错误以触发重试
      }
    }, {
      retries: 2,
      delay: 1000,
      shouldRetry: (error) => error.message?.includes('Network request failed') || error.message?.includes('timeout')
    }).catch(error => {
      errorService.handleError(error, { context: 'packageService.getCustomerOrders', silent: true });
      return [];
    });
  },

  // 获取客户最近的订单（userType / storeName 保留兼容，已忽略）
  async getRecentOrders(userId: string, limit: number = 5, email?: string, phone?: string, _userType?: string) {
    try {
      const rows = await fetchCustomerPackages({
        userId,
        email,
        phone,
        columns: '*',
      });
      return rows.slice(0, limit);
    } catch (error) {
      LoggerService.error('获取最近订单失败:', error);
      return [];
    }
  },

  // 获取客户订单统计（userType / storeName 保留兼容，已忽略）
  async getOrderStats(userId: string, email?: string, phone?: string, _userType?: string, _storeName?: string) {
    try {
      const rows = await fetchCustomerPackages({
        userId,
        email,
        phone,
        columns: 'id, status, created_at',
      });
      return computeOrderStats(rows);
    } catch (error) {
      LoggerService.error('获取订单统计失败:', error);
      return { ...EMPTY_ORDER_STATS, deliveredIds: [] as string[] };
    }
  },

  // 根据ID获取订单
  async getOrderById(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      LoggerService.error('获取订单详情失败:', error);
      return null;
    }
  },

  // 追踪订单（通过包裹ID）
  async trackOrder(trackingCode: string) {
    try {
      LoggerService.debug('正在查询订单:', trackingCode);
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', trackingCode.trim())
        .maybeSingle();

      LoggerService.debug('查询结果:', { data, error });

      if (error && error.code !== 'PGRST116') {
        LoggerService.error('Supabase查询错误:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      LoggerService.error('追踪订单失败:', error);
      return null;
    }
  },

  // 取消订单（增强版，带权限检查）
  async cancelOrder(orderId: string, customerId: string) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from('packages')
        .select('status, description')
        .eq('id', orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: '订单不存在' };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription = order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];
      
      if (customerIdFromDescription !== customerId) {
        return { success: false, message: '无权操作此订单' };
      }

      if (order.status !== '待取件') {
        return { success: false, message: '只有待取件状态的订单可以取消' };
      }

      // 3. 更新状态
      const { error } = await supabase
        .from('packages')
        .update({ 
          status: '已取消',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return { success: true, message: '订单已取消' };
    } catch (error) {
      LoggerService.error('取消订单失败:', error);
      return { success: false, message: '取消订单失败' };
    }
  },

  // 评价订单
  async rateOrder(orderId: string, customerId: string, rating: number, comment?: string, courierRating?: number) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from('packages')
        .select('status, description, customer_rating')
        .eq('id', orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: '订单不存在' };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription = order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];
      
      if (customerIdFromDescription !== customerId) {
        return { success: false, message: '无权操作此订单' };
      }

      if (order.status !== '已送达') {
        return { success: false, message: '只有已送达的订单可以评价' };
      }

      if (order.customer_rating) {
        return { success: false, message: '该订单已评价过' };
      }

      // 3. 添加评价
      const payload: Record<string, string | number> = {
        customer_rating: rating,
        customer_comment: comment || '',
        rating_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (typeof courierRating === 'number' && courierRating >= 1 && courierRating <= 5) {
        payload.courier_service_rating = courierRating;
      }
      const { error } = await supabase.from('packages').update(payload).eq('id', orderId);

      if (error) throw error;
      return { success: true, message: '评价成功' };
    } catch (error) {
      LoggerService.error('评价订单失败:', error);
      return { success: false, message: '评价订单失败' };
    }
  },

  // 获取追踪历史
  async getTrackingHistory(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('package_id', orderId)
        .order('event_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error('获取追踪历史失败:', error);
      return [];
    }
  },

  // 获取客户订单列表（userType / storeName 保留兼容，已忽略）
  async getAllOrders(userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    email?: string;
    phone?: string;
    userType?: string;
    storeName?: string;
  }) {
    try {
      const rows = await fetchCustomerPackages({
        userId,
        email: options?.email,
        phone: options?.phone,
        columns: '*',
        status: options?.status,
      });
      const offset = options?.offset || 0;
      const sliced = options?.limit ? rows.slice(offset, offset + options.limit) : rows.slice(offset);
      return { orders: sliced, total: rows.length };
    } catch (error) {
      LoggerService.error('获取订单列表失败:', error);
      return { orders: [], total: 0 };
    }
  },
};

