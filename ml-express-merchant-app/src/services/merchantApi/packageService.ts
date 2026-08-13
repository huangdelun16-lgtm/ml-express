import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";
import NotificationService from "../notificationService";
import { errorService } from "../ErrorService";
import { retry } from "../../utils/retry";
import { getProductItemFeeMmkForPackage } from "../../utils/parseMerchantProductFee";

// 包裹服务
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
        .from("packages")
        .insert([
          {
            ...packageData,
            status: "待取件",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 更新用户订单统计
      const { data: user } = await supabase
        .from("users")
        .select("total_orders, total_spent")
        .eq("id", packageData.customer_id)
        .single();

      if (user) {
        await supabase
          .from("users")
          .update({
            total_orders: (user.total_orders || 0) + 1,
            total_spent:
              (user.total_spent || 0) + parseFloat(packageData.price || "0"),
          })
          .eq("id", packageData.customer_id);
      }

      return { success: true, data };
    } catch (error) {
      const appError = errorService.handleError(error, {
        context: "packageService.createOrder",
        silent: true,
      });
      return { success: false, error: appError };
    }
  },

  // createPackage 别名（为了兼容性，接受完整的包裹数据）
  async createPackage(packageData: any) {
    try {
      // LoggerService.debug('开始创建订单，数据：', packageData); // 使用统一日志服务后可移除

      // 提取需要的字段并添加默认值
      // 注意：packages表没有customer_id字段，我们将客户ID添加到description中
      const customerNote = packageData.customer_id
        ? `[客户ID: ${packageData.customer_id}]`
        : "";
      const fullDescription =
        `${customerNote} ${packageData.description || ""}`.trim();

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
        price: String(packageData.price || "0"), // 确保是字符串
        delivery_speed: packageData.delivery_speed || "准时达",
        scheduled_delivery_time: packageData.scheduled_delivery_time || null,
        delivery_distance: packageData.delivery_distance || 0,
        status: packageData.status || "待取件",
        delivery_store_id: packageData.delivery_store_id || null, // 🚀 新增：保存配送店ID
        create_time:
          packageData.create_time || new Date().toLocaleString("zh-CN"),
        pickup_time: "",
        delivery_time: "",
        courier: "待分配",
        payment_method: packageData.payment_method || "cash", // 添加支付方式
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
        .from("packages")
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
            .from("users")
            .select("total_orders, total_spent")
            .eq("id", packageData.customer_id)
            .single();

          if (user) {
            await supabase
              .from("users")
              .update({
                total_orders: (user.total_orders || 0) + 1,
                total_spent:
                  (user.total_spent || 0) +
                  parseFloat(packageData.price || "0"),
              })
              .eq("id", packageData.customer_id);
          }
        } catch (updateError) {
          // 统计更新失败不影响订单创建，仅记录
          errorService.handleError(updateError, {
            context: "createPackage.updateStats",
            silent: true,
          });
        }
      }

      // 发送订单创建通知
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.sendOrderUpdateNotification({
          orderId: data.id,
          status: "待取件",
          customerName: packageData.sender_name,
          customerPhone: packageData.sender_phone,
        });
      } catch (notificationError) {
        errorService.handleError(notificationError, {
          context: "createPackage.sendNotification",
          silent: true,
        });
      }

      return { success: true, data };
    } catch (error: any) {
      const appError = errorService.handleError(error, {
        context: "packageService.createPackage",
        silent: true,
      });
      return {
        success: false,
        error: appError,
      };
    }
  },

  // 获取客户的所有订单（通过description中的客户ID匹配）
  async getCustomerOrders(customerId: string) {
    return retry(
      async () => {
        try {
          const { data, error } = await supabase
            .from("packages")
            .select("*")
            .ilike("description", `%[客户ID: ${customerId}]%`)
            .order("created_at", { ascending: false });

          if (error) throw error;
          return data || [];
        } catch (error) {
          throw error; // 抛出错误以触发重试
        }
      },
      {
        retries: 2,
        delay: 1000,
        shouldRetry: (error) =>
          error.message?.includes("Network request failed") ||
          error.message?.includes("timeout"),
      },
    ).catch((error) => {
      errorService.handleError(error, {
        context: "packageService.getCustomerOrders",
        silent: true,
      });
      return [];
    });
  },

  // 获取客户最近的订单（支持商家和普通客户）
  async getRecentOrders(
    userId: string,
    limit: number = 5,
    email?: string,
    phone?: string,
    userType?: string,
  ) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        let query = supabase
          .from("packages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (userType === "merchant") {
          // 商家：检查 delivery_store_id 或 customer_email (等于store_code)
          const conditions = [`delivery_store_id.eq.${userId}`];
          if (email) conditions.push(`customer_email.eq.${email}`);
          query = query.or(conditions.join(","));
        } else {
          // 普通客户：使用多种方式匹配订单
          const conditions: string[] = [];
          if (includeCustomerId) conditions.push(`customer_id.eq.${userId}`);
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (email) conditions.push(`customer_email.eq.${email}`);
          if (phone) conditions.push(`sender_phone.eq.${phone}`);
          query = query.or(conditions.join(","));
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || "";
        if (
          message.includes("customer_id") &&
          message.includes("does not exist")
        ) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error("获取最近订单失败:", error);
      return [];
    }
  },

  // 获取订单统计（针对客户ID、邮箱或手机号）
  // 注意：此方法使用与 getAllOrders 完全相同的查询逻辑，确保统计准确
  async getOrderStats(
    userId: string,
    email?: string,
    phone?: string,
    userType?: string,
    storeName?: string,
  ) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        // 使用与 getAllOrders 完全相同的查询逻辑，但只选择 status, delivery_speed 字段用于统计
        let query = supabase
          .from("packages")
          .select("status, delivery_speed")
          .order("created_at", { ascending: false });

        if (userType === "merchant") {
          const conditions: string[] = [];
          conditions.push(`delivery_store_id.eq.${userId}`);
          if (email) conditions.push(`customer_email.eq.${email}`);
          if (storeName) conditions.push(`sender_name.eq.${storeName}`);
          if (conditions.length > 0) query = query.or(conditions.join(","));
        } else {
          const conditions: string[] = [];
          if (includeCustomerId) conditions.push(`customer_id.eq.${userId}`);
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (email) conditions.push(`customer_email.eq.${email}`);
          if (phone) conditions.push(`sender_phone.eq.${phone}`);
          query = query.or(conditions.join(","));
        }

        const { data, error } = await query;

        if (error) {
          LoggerService.error("获取订单统计失败:", error);
          throw error;
        }

        const stats = {
          total: data?.length || 0,
          pending:
            data?.filter((p) =>
              ["待确认", "待取件", "待收款"].includes(p.status),
            ).length || 0,
          pendingConfirm:
            data?.filter((p) => p.status === "待确认").length || 0,
          awaitingPickup:
            data?.filter((p) => p.status === "待取件").length || 0,
          processing: data?.filter((p) => p.status === "打包中").length || 0,
          delivering: data?.filter((p) => p.status === "配送中").length || 0,
          inTransit:
            data?.filter((p) => ["已取件", "配送中"].includes(p.status))
              .length || 0,
          delivered: data?.filter((p) => p.status === "已送达").length || 0,
          cancelled: data?.filter((p) => p.status === "已取消").length || 0,
          urgent:
            data?.filter(
              (p) =>
                p.delivery_speed === "急送达" || p.delivery_speed === "Urgent",
            ).length || 0,
          standard:
            data?.filter(
              (p) =>
                p.delivery_speed === "普通配送" ||
                p.delivery_speed === "Standard",
            ).length || 0,
        };

        return stats;
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || "";
        if (
          message.includes("customer_id") &&
          message.includes("does not exist")
        ) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error("获取订单统计失败:", error);
      return {
        total: 0,
        pending: 0,
        pendingConfirm: 0,
        awaitingPickup: 0,
        processing: 0,
        delivering: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
        urgent: 0,
        standard: 0,
      };
    }
  },

  // 营收：今日/昨日「已送达」单量；总（自然年 1/1 至今）/昨/本日「已送达」仅商品费（getProductItemFeeMmkForPackage，不含跑腿与 price）
  async getRevenueStats(userId: string, storeName?: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yearStart = new Date(today.getFullYear(), 0, 1);
      yearStart.setHours(0, 0, 0, 0);

      const buildQuery = (startDate?: Date, endDate?: Date) => {
        let query = supabase
          .from("packages")
          .select("cod_amount, description")
          .eq("status", "已送达");
        const conditions = [`delivery_store_id.eq.${userId}`];
        if (storeName) conditions.push(`sender_name.eq.${storeName}`);
        query = query.or(conditions.join(","));
        if (startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }
        if (endDate) {
          query = query.lt("created_at", endDate.toISOString());
        }
        return query;
      };

      const sumItemFee = (
        data: { cod_amount?: number | null; description?: string | null }[] | null,
      ) => {
        const rows = data || [];
        return rows.reduce(
          (sum, p) => sum + getProductItemFeeMmkForPackage(p),
          0,
        );
      };

      const countRows = (
        data: { cod_amount?: number | null; description?: string | null }[] | null,
      ) => (data || []).length;

      const fetchItemFee = async (start?: Date, end?: Date) => {
        const { data, error } = await buildQuery(start, end);
        if (error) throw error;
        return sumItemFee(data);
      };

      const fetchCount = async (start?: Date, end?: Date) => {
        const { data, error } = await buildQuery(start, end);
        if (error) throw error;
        return countRows(data);
      };

      const [
        todayRevenue,
        yesterdayRevenue,
        revenueOneYear,
        todayOrderCount,
        yesterdayOrderCount,
      ] = await Promise.all([
        fetchItemFee(today, new Date()),
        fetchItemFee(yesterday, today),
        fetchItemFee(yearStart, undefined),
        fetchCount(today, new Date()),
        fetchCount(yesterday, today),
      ]);

      return {
        todayOrderCount,
        yesterdayOrderCount,
        todayRevenue,
        yesterdayRevenue,
        revenueOneYear,
      };
    } catch (error) {
      LoggerService.error("获取营收统计失败:", error);
      return {
        todayOrderCount: 0,
        yesterdayOrderCount: 0,
        todayRevenue: 0,
        yesterdayRevenue: 0,
        revenueOneYear: 0,
      };
    }
  },

  // 获取商家代收款统计
  async getMerchantStats(userId: string, storeName?: string, month?: string) {
    try {
      // 构建查询函数
      const runQuery = async (fields: string) => {
        let q = supabase.from("packages").select(fields).eq("status", "已送达");

        const conditions = [`delivery_store_id.eq.${userId}`];
        if (storeName) {
          conditions.push(`sender_name.eq.${storeName}`);
        }

        q = q.or(conditions.join(","));

        // 如果指定了月份，添加日期过滤
        if (month) {
          const [year, monthNum] = month.split("-");
          const startDate = `${year}-${monthNum}-01`;
          const endDate = new Date(parseInt(year), parseInt(monthNum), 0)
            .toISOString()
            .split("T")[0];
          q = q.gte("delivery_time", startDate).lte("delivery_time", endDate);
        }

        return q;
      };

      // 尝试查询所有字段
      let { data, error } = await runQuery(
        "cod_amount, cod_settled, cod_settled_at, status, delivery_time",
      );

      // 如果报错字段不存在 (42703)，降级查询（不查 cod_settled 相关字段）
      if (error && error.code === "42703") {
        LoggerService.warn("cod_settled 字段不存在，使用降级查询");
        const retryResult = await runQuery("cod_amount, status, delivery_time");
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) throw error;

      const statsData = (data || []) as any[];
      const totalCOD =
        statsData.reduce((sum, pkg) => sum + (pkg.cod_amount || 0), 0) || 0;

      // 如果没有 cod_settled 字段，data 中该属性为 undefined，!undefined 为 true，即默认未结清
      const settledPackages = statsData.filter((pkg) => pkg.cod_settled) || [];
      const settledCOD = settledPackages.reduce(
        (sum, pkg) => sum + (pkg.cod_amount || 0),
        0,
      );

      const unclearedPackages =
        statsData.filter((pkg) => !pkg.cod_settled) || [];
      const unclearedCOD = unclearedPackages.reduce(
        (sum, pkg) => sum + (pkg.cod_amount || 0),
        0,
      );
      const unclearedCount = unclearedPackages.length;

      // 计算最后结清日期
      const settledWithDatePackages =
        statsData.filter((pkg) => pkg.cod_settled && pkg.cod_settled_at) || [];
      let lastSettledAt = null;
      if (settledWithDatePackages.length > 0) {
        settledWithDatePackages.sort(
          (a, b) =>
            new Date(b.cod_settled_at!).getTime() -
            new Date(a.cod_settled_at!).getTime(),
        );
        lastSettledAt = settledWithDatePackages[0].cod_settled_at || null;
      }

      return {
        totalCOD: totalCOD || 0,
        settledCOD: settledCOD || 0,
        unclearedCOD: unclearedCOD || 0,
        unclearedCount: unclearedCount || 0,
        lastSettledAt: lastSettledAt,
      };
    } catch (error) {
      LoggerService.error("获取商家统计失败:", error);
      return {
        totalCOD: 0,
        settledCOD: 0,
        unclearedCOD: 0,
        unclearedCount: 0,
        lastSettledAt: null,
      };
    }
  },

  /** 指定月份已送达订单列表（含代收为 0，便于商家对账） */
  async getMerchantCODOrders(
    userId: string,
    storeName?: string,
    month?: string,
    settled?: boolean,
    page: number = 1,
    pageSize: number = 20,
  ) {
    try {
      let q = supabase
        .from("packages")
        .select("id, cod_amount, delivery_time, cod_settled, price", {
          count: "exact",
        })
        .eq("status", "已送达");

      const conditions = [`delivery_store_id.eq.${userId}`];
      if (storeName) {
        conditions.push(`sender_name.eq.${storeName}`);
      }

      q = q.or(conditions.join(","));

      // 如果指定了结算状态
      if (settled !== undefined) {
        if (settled) {
          q = q.eq("cod_settled", true);
        } else {
          q = q.or("cod_settled.eq.false,cod_settled.is.null");
        }
      }

      // 如果指定了月份，添加日期过滤
      if (month) {
        const [year, monthNum] = month.split("-");
        const startDate = `${year}-${monthNum}-01`;
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0)
          .toISOString()
          .split("T")[0];
        q = q.gte("delivery_time", startDate).lte("delivery_time", endDate);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await q
        .order("delivery_time", { ascending: false })
        .range(from, to);

      if (error) throw error;

      LoggerService.debug(
        `[getMerchantCODOrders] Fetched ${data?.length} orders, total count: ${count}`,
      );

      const orders = (data || []).map((pkg: any) => ({
        orderId: pkg.id,
        codAmount: pkg.cod_amount || 0,
        deliveryTime: pkg.delivery_time,
        deliveryFeeLabel: pkg.price || "",
      }));

      return { orders, total: count || 0 };
    } catch (error) {
      LoggerService.error("获取代收款订单列表失败:", error);
      return { orders: [], total: 0 };
    }
  },

  // 根据ID获取订单
  async getOrderById(orderId: string) {
    try {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      LoggerService.error("获取订单详情失败:", error);
      return null;
    }
  },

  // 追踪订单（通过包裹ID）
  async trackOrder(trackingCode: string) {
    try {
      LoggerService.debug("正在查询订单:", trackingCode);

      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", trackingCode.trim())
        .maybeSingle();

      LoggerService.debug("查询结果:", { data, error });

      if (error && error.code !== "PGRST116") {
        LoggerService.error("Supabase查询错误:", error);
        throw error;
      }

      return data;
    } catch (error) {
      LoggerService.error("追踪订单失败:", error);
      return null;
    }
  },

  // 取消订单（增强版，带权限检查）
  async cancelOrder(orderId: string, customerId: string) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from("packages")
        .select("status, description")
        .eq("id", orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: "订单不存在" };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription =
        order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];

      if (customerIdFromDescription !== customerId) {
        return { success: false, message: "无权操作此订单" };
      }

      if (order.status !== "待取件") {
        return { success: false, message: "只有待取件状态的订单可以取消" };
      }

      // 3. 更新状态
      const { error } = await supabase
        .from("packages")
        .update({
          status: "已取消",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true, message: "订单已取消" };
    } catch (error) {
      LoggerService.error("取消订单失败:", error);
      return { success: false, message: "取消订单失败" };
    }
  },

  // 评价订单
  async rateOrder(
    orderId: string,
    customerId: string,
    rating: number,
    comment?: string,
  ) {
    try {
      // 1. 检查订单状态和所有者
      const { data: order, error: checkError } = await supabase
        .from("packages")
        .select("status, description, customer_rating")
        .eq("id", orderId)
        .single();

      if (checkError) throw checkError;

      if (!order) {
        return { success: false, message: "订单不存在" };
      }

      // 2. 从description中提取客户ID（因为packages表没有customer_id字段）
      const customerIdFromDescription =
        order.description?.match(/\[客户ID: ([^\]]+)\]/)?.[1];

      if (customerIdFromDescription !== customerId) {
        return { success: false, message: "无权操作此订单" };
      }

      if (order.status !== "已送达") {
        return { success: false, message: "只有已送达的订单可以评价" };
      }

      if (order.customer_rating) {
        return { success: false, message: "该订单已评价过" };
      }

      // 3. 添加评价
      const { error } = await supabase
        .from("packages")
        .update({
          customer_rating: rating,
          customer_comment: comment || "",
          rating_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true, message: "评价成功" };
    } catch (error) {
      LoggerService.error("评价订单失败:", error);
      return { success: false, message: "评价订单失败" };
    }
  },

  // 获取追踪历史
  async getTrackingHistory(orderId: string) {
    try {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("package_id", orderId)
        .order("event_time", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      LoggerService.error("获取追踪历史失败:", error);
      return [];
    }
  },

  // 获取所有订单（带筛选和分页，通过description匹配）
  // 获取所有订单（支持分页和筛选，支持商家）
  async getAllOrders(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
      email?: string;
      phone?: string;
      userType?: string;
      storeName?: string; // 商家店铺名称，用于匹配 sender_name
    },
  ) {
    try {
      const runQuery = async (includeCustomerId: boolean) => {
        let query = supabase
          .from("packages")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

        if (options?.userType === "merchant") {
          // 商家订单查询：优先使用 delivery_store_id，如果没有则通过 sender_name 匹配
          const conditions: string[] = [];
          conditions.push(`delivery_store_id.eq.${userId}`);
          if (options.storeName) {
            conditions.push(`sender_name.eq.${options.storeName}`);
          }
          if (options.email) {
            conditions.push(`customer_email.eq.${options.email}`);
          }
          if (conditions.length > 0) {
            query = query.or(conditions.join(","));
          }
        } else {
          // 普通客户查询：使用多种方式匹配订单
          const conditions: string[] = [];
          if (includeCustomerId) {
            conditions.push(`customer_id.eq.${userId}`);
          }
          conditions.push(`description.ilike.%[客户ID: ${userId}]%`);
          if (options?.email) {
            conditions.push(`customer_email.eq.${options.email}`);
          }
          if (options?.phone) {
            conditions.push(`sender_phone.eq.${options.phone}`);
          }
          query = query.or(conditions.join(","));
        }

        if (options?.status && options.status !== "all") {
          query = query.eq("status", options.status);
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(
            options.offset,
            options.offset + (options.limit || 10) - 1,
          );
        }

        const { data, error, count } = await query;
        if (error) throw error;
        return { orders: data || [], total: count || 0 };
      };

      try {
        return await runQuery(true);
      } catch (error: any) {
        const message = error?.message || "";
        if (
          message.includes("customer_id") &&
          message.includes("does not exist")
        ) {
          return await runQuery(false);
        }
        throw error;
      }
    } catch (error) {
      LoggerService.error("获取订单列表失败:", error);
      return { orders: [], total: 0 };
    }
  },
};
