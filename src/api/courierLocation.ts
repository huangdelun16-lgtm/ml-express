import { supabase } from '../services/supabase';

// 骑手位置上报API接口
export interface CourierLocationUpdate {
  courier_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  battery_level?: number;
  status?: 'online' | 'offline' | 'busy' | 'available';
  timestamp?: string;
}

// 骑手位置上报响应
export interface CourierLocationResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    courier_id: string;
    latitude: number;
    longitude: number;
    last_update: string;
  };
  error?: string;
}

/**
 * 骑手位置上报API
 * 供骑手移动端或GPS设备调用
 */
export const updateCourierLocation = async (
  locationData: CourierLocationUpdate
): Promise<CourierLocationResponse> => {
  try {
    // 验证必需参数
    if (!locationData.courier_id || !locationData.latitude || !locationData.longitude) {
      return {
        success: false,
        message: '缺少必需参数：courier_id, latitude, longitude',
        error: 'MISSING_REQUIRED_PARAMS'
      };
    }

    // 验证坐标范围
    if (locationData.latitude < -90 || locationData.latitude > 90) {
      return {
        success: false,
        message: '纬度值无效，应在-90到90之间',
        error: 'INVALID_LATITUDE'
      };
    }

    if (locationData.longitude < -180 || locationData.longitude > 180) {
      return {
        success: false,
        message: '经度值无效，应在-180到180之间',
        error: 'INVALID_LONGITUDE'
      };
    }

    // 检查骑手是否存在
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('id, name, status')
      .eq('id', locationData.courier_id)
      .eq('status', 'active')
      .single();

    if (courierError || !courier) {
      return {
        success: false,
        message: '骑手不存在或无权限',
        error: 'COURIER_NOT_FOUND'
      };
    }

    // 准备位置数据
    const locationRecord = {
      courier_id: locationData.courier_id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      speed: locationData.speed || 0,
      battery_level: locationData.battery_level || 100,
      status: locationData.status || 'online',
      last_update: locationData.timestamp || new Date().toISOString()
    };

    // 检查是否已存在该骑手的位置记录
    const { data: existingLocation } = await supabase
      .from('courier_locations')
      .select('id')
      .eq('courier_id', locationData.courier_id)
      .single();

    let result;
    if (existingLocation) {
      // 更新现有记录
      const { data, error } = await supabase
        .from('courier_locations')
        .update(locationRecord)
        .eq('courier_id', locationData.courier_id)
        .select()
        .single();

      result = { data, error };
    } else {
      // 创建新记录
      const { data, error } = await supabase
        .from('courier_locations')
        .insert([locationRecord])
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('位置更新失败:', result.error);
      return {
        success: false,
        message: '位置更新失败',
        error: result.error.message
      };
    }

    // 记录位置更新事件到审计日志
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: locationData.courier_id,
        action: 'location_update',
        details: `骑手位置更新: ${locationData.latitude}, ${locationData.longitude}`,
        timestamp: new Date().toISOString()
      }]);

    return {
      success: true,
      message: '位置更新成功',
      data: {
        id: result.data.id,
        courier_id: result.data.courier_id,
        latitude: result.data.latitude,
        longitude: result.data.longitude,
        last_update: result.data.last_update
      }
    };

  } catch (error) {
    console.error('位置上报API错误:', error);
    return {
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
};

/**
 * 批量获取骑手位置信息
 */
export const getCourierLocations = async (courierIds?: string[]): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    // 仅查询位置表，避免因外键名不匹配导致的关系错误；
    // 骑手详细信息在上层通过 trackingService.getActiveCouriers() 获取并前端关联。
    let query = supabase
      .from('courier_locations')
      .select('*')
      .order('last_update', { ascending: false });

    if (courierIds && courierIds.length > 0) {
      query = query.in('courier_id', courierIds);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
};

/**
 * 获取骑手历史轨迹
 */
export const getCourierTrackingHistory = async (
  courierId: string,
  startTime?: string,
  endTime?: string
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    let query = supabase
      .from('tracking_events')
      .select('*')
      .eq('courier_id', courierId)
      .order('event_time', { ascending: true });

    if (startTime) {
      query = query.gte('event_time', startTime);
    }

    if (endTime) {
      query = query.lte('event_time', endTime);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
};

// 导出默认对象
const courierLocationService = {
  updateCourierLocation,
  getCourierLocations,
  getCourierTrackingHistory
};

export default courierLocationService;