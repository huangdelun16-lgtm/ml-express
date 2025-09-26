import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 
                   process.env.SUPABASE_URL || 
                   localStorage.getItem('supabase_url') ||
                   'https://cabtgyzmokewrgkxjgvg.supabase.co';

const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 
                       process.env.SUPABASE_ANON_KEY || 
                       localStorage.getItem('supabase_key') ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYnRneXptb2tld3Jna3hqZ3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjAyOTMsImV4cCI6MjA3MDg5NjI5M30.kL_XN5ySfmlD5YIdXr5AgLHs3-4j0y90a9LOEUOjcnc';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    })
  : null;

// 数据库表定义
export interface SupabaseEmployee {
  id: string;
  work_id: string;
  username: string;
  role: 'employee' | 'accountant' | 'manager' | 'admin';
  name: string;
  phone: string;
  email: string;
  address: string;
  id_number: string;
  join_date: string;
  salary: number;
  avatar_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SupabaseOrder {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_type: string;
  weight: number;
  distance: number;
  amount: number;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  courier_id?: string;
  courier_name?: string;
  courier_phone?: string;
  service_type: string;
  description?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 数据库操作函数
export class SupabaseService {
  // 员工管理
  static async getEmployees(): Promise<SupabaseEmployee[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createEmployee(employee: Omit<SupabaseEmployee, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseEmployee> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateEmployee(id: string, updates: Partial<SupabaseEmployee>): Promise<SupabaseEmployee> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteEmployee(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // 包裹管理
  static async getOrders(): Promise<SupabaseOrder[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createOrder(order: Omit<SupabaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseOrder> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateOrder(id: string, updates: Partial<SupabaseOrder>): Promise<SupabaseOrder> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteOrder(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // 数据迁移 - 从localStorage迁移到Supabase
  static async migrateLocalDataToSupabase(): Promise<{ employees: number; orders: number }> {
    if (!supabase) throw new Error('Supabase未配置');
    
    let employeeCount = 0;
    let orderCount = 0;

    try {
      // 迁移员工数据
      const localEmployees = localStorage.getItem('company_employees');
      if (localEmployees) {
        const employees = JSON.parse(localEmployees);
        for (const emp of employees) {
          try {
            await this.createEmployee({
              work_id: emp.workId,
              username: emp.username,
              role: emp.role,
              name: emp.name,
              phone: emp.phone,
              email: emp.email,
              address: emp.address,
              id_number: emp.idNumber,
              join_date: emp.joinDate,
              salary: emp.salary,
              avatar_url: emp.avatar,
              status: emp.status || 'active',
            });
            employeeCount++;
          } catch (error) {
            console.error('迁移员工失败:', emp.name, error);
          }
        }
      }

      // 迁移订单数据
      const localOrders = localStorage.getItem('courier_orders');
      if (localOrders) {
        const orders = JSON.parse(localOrders);
        for (const order of orders) {
          try {
            await this.createOrder({
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
            });
            orderCount++;
          } catch (error) {
            console.error('迁移订单失败:', order.orderId, error);
          }
        }
      }

      return { employees: employeeCount, orders: orderCount };
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw error;
    }
  }

  // 检查Supabase连接状态
  static async checkConnection(): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase.from('employees').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

export default SupabaseService;
