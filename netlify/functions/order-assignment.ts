import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface RiderAssignment {
  riderId: string;
  riderName: string;
  taskId: string;
  taskType: 'pickup' | 'delivery';
  trackingNumber: string;
  destination: string;
  estimatedTime: number;
  assignedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  assignedBy: string;
}

// 内存存储待接单任务
const pendingAssignments = new Map<string, RiderAssignment>();

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ml-actor, x-ml-role',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const httpMethod = event.httpMethod;
  const path = event.path;

  try {
    if (httpMethod === 'POST') {
      // 创建新的任务分配
      const body = JSON.parse(event.body || '{}');
      const { 
        riderId, 
        riderName, 
        taskType, 
        trackingNumber, 
        destination, 
        estimatedTime = 30,
        assignedBy 
      } = body;

      if (!riderId || !taskType || !trackingNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '缺少必要参数' })
        };
      }

      const taskId = `task_${Date.now()}_${riderId}`;
      const assignment: RiderAssignment = {
        riderId,
        riderName: riderName || riderId,
        taskId,
        taskType,
        trackingNumber,
        destination: destination || '未知',
        estimatedTime,
        assignedAt: new Date().toISOString(),
        status: 'pending',
        assignedBy: assignedBy || 'system'
      };

      pendingAssignments.set(taskId, assignment);

      // 这里可以添加推送通知逻辑
      console.log(`📱 新任务分配给骑手 ${riderName} (${riderId}): ${trackingNumber}`);

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

    if (httpMethod === 'GET') {
      const queryParams = new URLSearchParams(event.queryString || '');
      const riderId = queryParams.get('riderId');
      const taskId = queryParams.get('taskId');

      if (taskId) {
        // 获取特定任务
        const assignment = pendingAssignments.get(taskId);
        if (!assignment) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: '任务不存在' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: assignment })
        };
      }

      if (riderId) {
        // 获取特定骑手的待处理任务
        const riderAssignments = Array.from(pendingAssignments.values())
          .filter(assignment => assignment.riderId === riderId)
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

      // 获取所有待处理任务
      const allAssignments = Array.from(pendingAssignments.values())
        .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          data: allAssignments,
          count: allAssignments.length 
        })
      };
    }

    if (httpMethod === 'PUT') {
      // 更新任务状态（接单、拒单、完成）
      const body = JSON.parse(event.body || '{}');
      const { taskId, status, riderId } = body;

      if (!taskId || !status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '缺少任务ID或状态' })
        };
      }

      const assignment = pendingAssignments.get(taskId);
      if (!assignment) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: '任务不存在' })
        };
      }

      // 验证骑手权限
      if (riderId && assignment.riderId !== riderId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ success: false, message: '无权限操作此任务' })
        };
      }

      assignment.status = status;
      
      if (status === 'accepted') {
        console.log(`✅ 骑手 ${assignment.riderName} 接受了任务 ${assignment.trackingNumber}`);
      } else if (status === 'rejected') {
        console.log(`❌ 骑手 ${assignment.riderName} 拒绝了任务 ${assignment.trackingNumber}`);
        // 可以在这里添加重新分配逻辑
      } else if (status === 'completed') {
        console.log(`🎉 骑手 ${assignment.riderName} 完成了任务 ${assignment.trackingNumber}`);
        // 任务完成后可以从内存中移除
        pendingAssignments.delete(taskId);
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

    if (httpMethod === 'DELETE') {
      // 删除任务（取消分配）
      const queryParams = new URLSearchParams(event.queryString || '');
      const taskId = queryParams.get('taskId');

      if (!taskId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '缺少任务ID' })
        };
      }

      const deleted = pendingAssignments.delete(taskId);
      if (!deleted) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: '任务不存在' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '任务已取消' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: '不支持的HTTP方法' })
    };

  } catch (error) {
    console.error('订单分配API错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      })
    };
  }
};

