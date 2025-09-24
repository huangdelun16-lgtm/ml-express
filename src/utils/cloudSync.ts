import SupabaseService, { SupabaseEmployee, SupabaseOrder } from './supabaseClient';

// 云同步管理器
export class CloudSyncManager {
  private static isCloudEnabled(): boolean {
    return localStorage.getItem('use_cloud_storage') === 'true';
  }

  // 员工数据同步
  static async syncEmployees(): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      // 从云端获取最新数据
      const cloudEmployees = await SupabaseService.getEmployees();
      
      // 转换为本地格式
      const localFormat = cloudEmployees.map(emp => ({
        id: emp.id,
        workId: emp.work_id,
        username: emp.username,
        role: emp.role,
        name: emp.name,
        phone: emp.phone,
        email: emp.email,
        address: emp.address,
        idNumber: emp.id_number,
        joinDate: emp.join_date,
        salary: emp.salary,
        avatar: emp.avatar_url,
        status: emp.status,
      }));

      // 更新本地存储
      localStorage.setItem('company_employees', JSON.stringify(localFormat));
      console.log('员工数据已从云端同步:', localFormat.length, '条记录');
    } catch (error) {
      console.error('员工数据同步失败:', error);
    }
  }

  static async syncOrders(): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      // 从云端获取最新数据
      const cloudOrders = await SupabaseService.getOrders();
      
      // 转换为本地格式
      const localFormat = cloudOrders.map(order => ({
        orderId: order.order_id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        senderAddress: order.sender_address,
        receiverName: order.receiver_name,
        receiverPhone: order.receiver_phone,
        receiverAddress: order.receiver_address,
        packageType: order.package_type,
        weight: order.weight,
        distance: order.distance,
        amount: order.amount,
        status: order.status,
        courierId: order.courier_id,
        courierName: order.courier_name,
        courierPhone: order.courier_phone,
        serviceType: order.service_type,
        description: order.description,
        estimatedDelivery: order.estimated_delivery,
        actualDelivery: order.actual_delivery,
        notes: order.notes,
        createdAt: order.created_at,
      }));

      // 更新本地存储
      localStorage.setItem('courier_orders', JSON.stringify(localFormat));
      console.log('订单数据已从云端同步:', localFormat.length, '条记录');
    } catch (error) {
      console.error('订单数据同步失败:', error);
    }
  }

  // 保存员工到云端
  static async saveEmployeeToCloud(employee: any): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      const cloudFormat: Omit<SupabaseEmployee, 'id' | 'created_at' | 'updated_at'> = {
        work_id: employee.workId,
        username: employee.username,
        role: employee.role,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        address: employee.address,
        id_number: employee.idNumber,
        join_date: employee.joinDate,
        salary: employee.salary,
        avatar_url: employee.avatar,
        status: employee.status || 'active',
      };

      if (employee.id) {
        // 更新现有员工
        await SupabaseService.updateEmployee(employee.id, cloudFormat);
      } else {
        // 创建新员工
        await SupabaseService.createEmployee(cloudFormat);
      }
      
      console.log('员工数据已保存到云端:', employee.name);
    } catch (error) {
      console.error('保存员工到云端失败:', error);
      throw error;
    }
  }

  // 保存订单到云端
  static async saveOrderToCloud(order: any): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      const cloudFormat: Omit<SupabaseOrder, 'id' | 'created_at' | 'updated_at'> = {
        order_id: order.orderId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        sender_address: order.senderAddress,
        receiver_name: order.receiverName,
        receiver_phone: order.receiverPhone,
        receiver_address: order.receiverAddress,
        package_type: order.packageType,
        weight: order.weight,
        distance: order.distance,
        amount: order.amount,
        status: order.status,
        courier_id: order.courierId,
        courier_name: order.courierName,
        courier_phone: order.courierPhone,
        service_type: order.serviceType,
        description: order.description,
        estimated_delivery: order.estimatedDelivery,
        actual_delivery: order.actualDelivery,
        notes: order.notes,
      };

      if (order.id) {
        // 更新现有订单
        await SupabaseService.updateOrder(order.id, cloudFormat);
      } else {
        // 创建新订单
        await SupabaseService.createOrder(cloudFormat);
      }
      
      console.log('订单数据已保存到云端:', order.orderId);
    } catch (error) {
      console.error('保存订单到云端失败:', error);
      throw error;
    }
  }

  // 启动自动同步
  static startAutoSync(): void {
    if (!this.isCloudEnabled()) return;

    // 每5分钟同步一次数据
    const interval = setInterval(async () => {
      try {
        await this.syncEmployees();
        await this.syncOrders();
        console.log('自动同步完成');
      } catch (error) {
        console.error('自动同步失败:', error);
      }
    }, 5 * 60 * 1000);

    // 页面卸载时清除定时器
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });
  }

  // 获取同步状态
  static getSyncStatus(): {
    enabled: boolean;
    lastSync: string | null;
  } {
    return {
      enabled: this.isCloudEnabled(),
      lastSync: localStorage.getItem('last_cloud_sync'),
    };
  }
}

export default CloudSyncManager;
