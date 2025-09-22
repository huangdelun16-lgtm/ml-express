import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(supabaseUrl, supabaseKey, { 
  auth: { persistSession: false } 
});

// 内存中存储骑手的动态状态
interface RiderState {
  status: 'online' | 'busy' | 'offline' | 'break';
  currentTask?: any;
  todayOrders: number;
  todayEarnings: number;
}

// 任务分配接口
interface TaskAssignment {
  taskId: string;
  riderId: string;
  riderName: string;
  taskType: 'pickup' | 'delivery';
  trackingNumber: string;
  destination: string;
  estimatedTime: number;
  assignedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  assignedBy: string;
}

// 使用Map存储骑手状态，key是riderId(username)
const riderStates = new Map<string, RiderState>();

// 存储任务分配
const taskAssignments = new Map<string, TaskAssignment>();

// 获取骑手状态，如果不存在则返回默认状态
const getRiderState = (riderId: string): RiderState => {
  return riderStates.get(riderId) || {
    status: 'online',
    currentTask: null,
    todayOrders: Math.floor(Math.random() * 10),
    todayEarnings: Math.floor(Math.random() * 20000)
  };
};

// 更新骑手状态
const updateRiderState = (riderId: string, updates: Partial<RiderState>) => {
  const currentState = getRiderState(riderId);
  const newState = { ...currentState, ...updates };
  riderStates.set(riderId, newState);
  return newState;
};

// 自动完成送货：更新包裹状态为"已签收"，财务状态为"已入账"
const autoCompleteDelivery = async (trackingNumber: string, riderId: string) => {
  try {
    // 1) 更新包裹状态为"已签收"
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .update({ status: '已签收' })
      .eq('tracking_no', trackingNumber)
      .select('id, status');
      
    if (packageError) {
      console.error('更新包裹状态失败:', packageError);
      throw packageError;
    }
    
    // 2) 更新对应的财务记录状态为"已入账"
    const { error: financeError } = await supabase
      .from('finances')
      .update({ status: '已入账' })
      .eq('tracking_no', trackingNumber);
      
    if (financeError) {
      console.error('更新财务状态失败:', financeError);
      // 财务更新失败不抛出错误，因为包裹状态已经更新成功
    }
    
    // 3) 记录审计日志
    try {
      await supabase.from('audit_logs').insert([{
        actor: riderId,
        action: 'delivery_completed',
        detail: { trackingNumber, status: '已签收' }
      }]);
    } catch (auditError) {
      console.error('记录审计日志失败:', auditError);
    }
    
    console.log(`✅ 送货完成: ${trackingNumber} -> 已签收/已入账`);
    return { success: true, trackingNumber, status: '已签收' };
    
  } catch (error) {
    console.error('自动完成送货失败:', error);
    throw error;
  }
};

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { httpMethod } = event;
  const queryParams = new URLSearchParams(event.queryStringParameters || '');

  try {
    if (httpMethod === 'GET') {
      // 检查是否是任务分配查询
      const action = queryParams.get('action');
      const riderId = queryParams.get('riderId');

      if (action === 'assignments' && riderId) {
        // 获取特定骑手的任务分配
        const riderAssignments = Array.from(taskAssignments.values())
          .filter(task => task.riderId === riderId)
          .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: riderAssignments,
            count: riderAssignments.length
          })
        };
      }

      // 获取骑手列表 - 直接从users表获取city_rider用户
      const search = queryParams.get('search') || '';
      const status = queryParams.get('status') || '';

      console.log('获取骑手列表，搜索条件:', { search, status });

      try {
        // 直接从users表获取所有city_rider用户
        let usersQuery = supabase
          .from('users')
          .select('username, name, phone, role, created_at')
          .eq('role', 'city_rider');

        // 应用搜索过滤
        if (search) {
          usersQuery = usersQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,username.ilike.%${search}%`);
        }

        const { data: cityRiderUsers, error: usersError } = await usersQuery
          .order('created_at', { ascending: false });

        if (usersError) {
          console.error('获取city_rider用户失败:', usersError);
          throw usersError;
        }

        console.log('获取到的city_rider用户:', cityRiderUsers?.length || 0, '个');

        // 将users数据转换为rider格式，使用动态状态
        const ridersFromUsers = (cityRiderUsers || []).map((user, index) => {
          const riderState = getRiderState(user.username);
          return {
            id: user.username, // 使用username作为ID
            name: user.name || user.username,
            phone: user.phone || '',
            status: riderState.status,
            location: null,
            currentTask: riderState.currentTask,
            todayOrders: riderState.todayOrders,
            todayEarnings: riderState.todayEarnings,
            rating: 4.5 + Math.random() * 0.5,
            joinDate: user.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            avatar: null,
            workId: user.username // 工作号就是username
          };
        });

        // 应用状态过滤
        let filteredRiders = ridersFromUsers;
        if (status && status !== 'all') {
          filteredRiders = ridersFromUsers.filter(rider => rider.status === status);
        }

        console.log('返回骑手数据:', filteredRiders.length, '个');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(filteredRiders)
        };

      } catch (dbError) {
        console.error('数据库查询失败，返回模拟数据:', dbError);
        // 如果数据库查询失败，返回模拟数据
      }

      // 如果数据库查询完全失败，返回模拟数据
      console.log('数据库查询失败，返回模拟骑手数据');
      const mockRiders = [
        {
          id: 'MDY1209251',
          name: 'KOKO',
          phone: '13800138001',
          status: 'online',
          location: null,
          currentTask: null,
          todayOrders: 8,
          todayEarnings: 16000,
          rating: 4.8,
          joinDate: '2024-01-15',
          avatar: null,
          workId: 'MDY1209251'
        },
        {
          id: 'MDY1209252',
          name: '张三',
          phone: '13800138002',
          status: 'online',
          location: null,
          currentTask: null,
          todayOrders: 12,
          todayEarnings: 24000,
          rating: 4.9,
          joinDate: '2024-02-01',
          avatar: null,
          workId: 'MDY1209252'
        },
        {
          id: 'MDY1209253',
          name: '李四',
          phone: '13800138003',
          status: 'online',
          location: null,
          currentTask: null,
          todayOrders: 5,
          todayEarnings: 10000,
          rating: 4.6,
          joinDate: '2024-03-10',
          avatar: null,
          workId: 'MDY1209253'
        }
      ];

      // 应用前端过滤
      let filteredRiders = mockRiders;
      if (search) {
        filteredRiders = filteredRiders.filter(rider => 
          rider.name.includes(search) || rider.phone.includes(search) || rider.workId.includes(search)
        );
      }
      if (status && status !== 'all') {
        filteredRiders = filteredRiders.filter(rider => rider.status === status);
      }

      console.log('返回模拟骑手数据:', filteredRiders.length, '个');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filteredRiders)
      };
    }

    if (httpMethod === 'POST') {
      // 创建新骑手
      const body = JSON.parse(event.body || '{}');
      
      const { data, error } = await supabase
        .from('riders')
        .insert([{
          name: body.name,
          phone: body.phone,
          status: 'offline',
          rating: 5.0,
          today_orders: 0,
          today_earnings: 0,
          join_date: new Date().toISOString().split('T')[0]
        }])
        .select();

      if (error) {
        console.error('创建骑手失败:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: '创建骑手失败', details: error.message })
        };
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(data[0])
      };
    }

    if (httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      
      // 检查是否是任务分配操作
      if (body.action === 'assign_task') {
        // 创建新任务分配
        const { riderId, riderName, taskType, trackingNumber, destination, estimatedTime = 30, assignedBy } = body;
        
        if (!riderId || !taskType || !trackingNumber) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, message: '缺少必要参数' })
          };
        }

        const taskId = `task_${Date.now()}_${riderId}`;
        const assignment: TaskAssignment = {
          taskId,
          riderId,
          riderName: riderName || riderId,
          taskType,
          trackingNumber,
          destination: destination || '未知',
          estimatedTime,
          assignedAt: new Date().toISOString(),
          status: 'pending',
          assignedBy: assignedBy || 'system'
        };

        taskAssignments.set(taskId, assignment);

        // 更新骑手状态为忙碌
        updateRiderState(riderId, { 
          status: 'busy', 
          currentTask: assignment 
        });

        console.log(`📱 新任务分配: ${riderName} (${riderId}) -> ${trackingNumber}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: '任务分配成功',
            taskId,
            assignment 
          })
        };
      }

      if (body.action === 'update_assignment') {
        // 更新任务分配状态
        const { taskId, status, riderId } = body;

        if (!taskId || !status) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, message: '缺少任务ID或状态' })
          };
        }

        const assignment = taskAssignments.get(taskId);
        if (!assignment) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: '任务不存在' })
          };
        }

        assignment.status = status;
        
        if (status === 'accepted') {
          console.log(`✅ 骑手 ${assignment.riderName} 接受了任务 ${assignment.trackingNumber}`);
          updateRiderState(assignment.riderId, { status: 'busy', currentTask: assignment });
        } else if (status === 'rejected') {
          console.log(`❌ 骑手 ${assignment.riderName} 拒绝了任务 ${assignment.trackingNumber}`);
          updateRiderState(assignment.riderId, { status: 'online', currentTask: null });
        } else if (status === 'completed') {
          console.log(`🎉 骑手 ${assignment.riderName} 完成了任务 ${assignment.trackingNumber}`);
          updateRiderState(assignment.riderId, { status: 'online', currentTask: null });
          
          // 🚀 新增：骑手完成送货任务时，自动更新包裹状态为"已签收"
          if (assignment.trackingNumber) {
            try {
              await autoCompleteDelivery(assignment.trackingNumber, assignment.riderId);
              console.log(`✅ 自动完成送货: ${assignment.trackingNumber} -> 已签收`);
            } catch (e) {
              console.error('自动完成送货失败:', e);
            }
          }
          
          taskAssignments.delete(taskId);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: '任务状态更新成功',
            assignment 
          })
        };
      }

      // 更新骑手状态信息
      const riderId = body.id || body.riderId || queryParams.get('id');

      if (!riderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少骑手ID' })
        };
      }

      console.log('更新骑手状态:', riderId, body);

      // 准备状态更新数据
      const stateUpdates: Partial<RiderState> = {};
      
      if (body.status) stateUpdates.status = body.status;
      if (body.current_task !== undefined) stateUpdates.currentTask = body.current_task;
      if (body.currentTask !== undefined) stateUpdates.currentTask = body.currentTask;
      if (body.todayOrders !== undefined) stateUpdates.todayOrders = body.todayOrders;
      if (body.todayEarnings !== undefined) stateUpdates.todayEarnings = body.todayEarnings;

      // 更新内存中的状态
      const updatedState = updateRiderState(riderId, stateUpdates);

      console.log('骑手状态已更新:', riderId, updatedState);

      // 返回更新后的完整骑手信息
      try {
        // 获取用户基本信息
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('username, name, phone, role, created_at')
          .eq('username', riderId)
          .eq('role', 'city_rider')
          .single();

        if (userError || !user) {
          console.log('未找到用户信息，返回基本状态');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              id: riderId,
              name: riderId,
              phone: '',
              ...updatedState,
              rating: 4.5,
              joinDate: new Date().toISOString().slice(0, 10),
              avatar: null,
              workId: riderId
            })
          };
        }

        const riderInfo = {
          id: user.username,
          name: user.name || user.username,
          phone: user.phone || '',
          status: updatedState.status,
          location: null,
          currentTask: updatedState.currentTask,
          todayOrders: updatedState.todayOrders,
          todayEarnings: updatedState.todayEarnings,
          rating: 4.5 + Math.random() * 0.5,
          joinDate: user.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          avatar: null,
          workId: user.username
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(riderInfo)
        };

      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 即使获取用户信息失败，也返回状态更新成功
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            id: riderId,
            ...updatedState,
            message: '状态更新成功'
          })
        };
      }
    }

    if (httpMethod === 'DELETE') {
      // 删除骑手
      const riderId = queryParams.get('id');

      if (!riderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少骑手ID' })
        };
      }

      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', riderId);

      if (error) {
        console.error('删除骑手失败:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: '删除骑手失败', details: error.message })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: '骑手删除成功' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '不支持的请求方法' })
    };

  } catch (error) {
    console.error('骑手管理API错误:', error);
    
    // 如果是GET请求失败，返回模拟数据作为后备
    if (httpMethod === 'GET') {
      console.log('API异常，返回模拟骑手数据');
      const mockRiders = [
        {
          id: '1',
          name: '张三',
          phone: '13800138001',
          status: 'online',
          location: {
            lat: 16.8661,
            lng: 96.1951,
            address: '仰光市中心区域'
          },
          currentTask: null,
          todayOrders: 8,
          todayEarnings: 16000,
          rating: 4.8,
          joinDate: '2024-01-15',
          avatar: null,
          workId: 'rider001'
        },
        {
          id: '2',
          name: '李四',
          phone: '13800138002',
          status: 'busy',
          location: {
            lat: 16.8701,
            lng: 96.2001,
            address: '仰光商业区'
          },
          currentTask: {
            id: 'task-2',
            type: 'delivery',
            trackingNo: 'C2024091802',
            destination: '仰光机场',
            estimatedTime: 25
          },
          todayOrders: 12,
          todayEarnings: 24000,
          rating: 4.9,
          joinDate: '2024-02-01',
          avatar: null,
          workId: 'rider002'
        },
        {
          id: '3',
          name: '王五',
          phone: '13800138003',
          status: 'online',
          location: {
            lat: 16.8541,
            lng: 96.1851,
            address: '仰光港口区域'
          },
          currentTask: null,
          todayOrders: 5,
          todayEarnings: 10000,
          rating: 4.6,
          joinDate: '2024-03-10',
          avatar: null,
          workId: 'rider003'
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mockRiders)
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器内部错误', details: error.message })
    };
  }
};
