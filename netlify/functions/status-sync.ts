import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface RiderStatus {
  riderId: string;
  status: 'online' | 'busy' | 'offline' | 'break';
  currentTask: any;
  lastUpdate: string;
  source: 'web' | 'app';
}

// 内存存储骑手状态（生产环境应使用数据库）
const riderStatuses = new Map<string, RiderStatus>();

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
  
  try {
    if (httpMethod === 'POST' || httpMethod === 'PUT') {
      // 更新骑手状态
      const body = JSON.parse(event.body || '{}');
      const { riderId, status, currentTask, source = 'unknown' } = body;

      if (!riderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '缺少骑手ID' })
        };
      }

      const statusUpdate: RiderStatus = {
        riderId,
        status: status || 'offline',
        currentTask: currentTask || null,
        lastUpdate: new Date().toISOString(),
        source
      };

      riderStatuses.set(riderId, statusUpdate);

      console.log(`🔄 状态同步更新: ${riderId} -> ${status} (来源: ${source})`);

      // 这里可以添加推送通知逻辑，通知其他客户端状态变更
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: '状态同步成功',
          data: statusUpdate
        })
      };
    }

    if (httpMethod === 'GET') {
      const queryParams = new URLSearchParams(event.queryString || '');
      const riderId = queryParams.get('riderId');
      const source = queryParams.get('source');

      if (riderId) {
        // 获取特定骑手状态
        const status = riderStatuses.get(riderId);
        if (!status) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: '骑手状态不存在' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, data: status })
        };
      }

      // 获取所有骑手状态
      const allStatuses = Array.from(riderStatuses.values());
      
      // 如果指定了来源，可以过滤
      const filteredStatuses = source 
        ? allStatuses.filter(status => status.source !== source)
        : allStatuses;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          data: filteredStatuses,
          count: filteredStatuses.length
        })
      };
    }

    if (httpMethod === 'DELETE') {
      // 删除骑手状态（骑手下线时调用）
      const queryParams = new URLSearchParams(event.queryString || '');
      const riderId = queryParams.get('riderId');

      if (!riderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: '缺少骑手ID' })
        };
      }

      const deleted = riderStatuses.delete(riderId);
      if (!deleted) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, message: '骑手状态不存在' })
        };
      }

      console.log(`🗑️ 骑手状态已删除: ${riderId}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '骑手状态已删除' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: '不支持的HTTP方法' })
    };

  } catch (error) {
    console.error('状态同步API错误:', error);
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

