import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 内存中存储骑手位置信息
interface RiderLocation {
  riderId: string;
  lat: number;
  lng: number;
  address: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  lastUpdate: string;
  deviceId?: string;
  batteryLevel?: number;
}

// 使用Map存储位置信息，key是riderId
const riderLocations = new Map<string, RiderLocation>();

// 获取骑手位置，如果不存在则返回模拟位置
const getRiderLocation = (riderId: string): RiderLocation => {
  const existing = riderLocations.get(riderId);
  if (existing) return existing;
  
  // 返回仰光市中心附近的模拟位置
  const baseLocation = {
    lat: 16.8661 + (Math.random() - 0.5) * 0.1,
    lng: 96.1951 + (Math.random() - 0.5) * 0.1
  };
  
  const mockLocation: RiderLocation = {
    riderId,
    lat: baseLocation.lat,
    lng: baseLocation.lng,
    address: `仰光市${['中心区', '商业区', '港口区', '机场区', '工业区'][Math.floor(Math.random() * 5)]}`,
    accuracy: 5 + Math.random() * 10,
    speed: Math.random() * 30,
    heading: Math.random() * 360,
    lastUpdate: new Date().toISOString(),
    batteryLevel: 20 + Math.random() * 80
  };
  
  riderLocations.set(riderId, mockLocation);
  return mockLocation;
};

// 更新骑手位置
const updateRiderLocation = (riderId: string, locationData: Partial<RiderLocation>): RiderLocation => {
  const currentLocation = getRiderLocation(riderId);
  const updatedLocation: RiderLocation = {
    ...currentLocation,
    ...locationData,
    riderId,
    lastUpdate: new Date().toISOString()
  };
  
  riderLocations.set(riderId, updatedLocation);
  return updatedLocation;
};

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      // 获取骑手位置信息
      const riderId = queryParams.get('riderId');
      
      if (riderId) {
        // 获取单个骑手位置
        const location = getRiderLocation(riderId);
        
        console.log(`获取骑手 ${riderId} 的位置信息:`, location);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(location)
        };
      } else {
        // 获取所有骑手位置
        console.log('获取所有骑手位置信息');
        
        // 首先从users表获取所有city_rider用户
        try {
          const { data: cityRiderUsers, error: usersError } = await supabase
            .from('users')
            .select('username, name')
            .eq('role', 'city_rider');

          if (usersError) {
            console.error('获取city_rider用户失败:', usersError);
          }

          const allLocations: RiderLocation[] = [];
          
          // 为每个骑手获取或生成位置信息
          if (cityRiderUsers && cityRiderUsers.length > 0) {
            for (const user of cityRiderUsers) {
              const location = getRiderLocation(user.username);
              allLocations.push(location);
            }
          } else {
            // 如果没有找到用户，返回模拟数据
            const mockRiders = ['MDY1209251', 'MDY1209252', 'MDY1209253'];
            for (const riderId of mockRiders) {
              const location = getRiderLocation(riderId);
              allLocations.push(location);
            }
          }

          console.log(`返回 ${allLocations.length} 个骑手的位置信息`);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allLocations)
          };

        } catch (dbError) {
          console.error('数据库查询失败，返回模拟位置数据:', dbError);
          
          // 数据库查询失败时返回模拟数据
          const mockRiders = ['MDY1209251', 'MDY1209252', 'MDY1209253'];
          const allLocations = mockRiders.map(riderId => getRiderLocation(riderId));

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(allLocations)
          };
        }
      }
    }

    if (httpMethod === 'POST') {
      // 更新骑手位置（供手机APP调用）
      const body = JSON.parse(event.body || '{}');
      const { riderId, lat, lng, address, accuracy, speed, heading, deviceId, batteryLevel } = body;

      if (!riderId || lat === undefined || lng === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: '缺少必要参数', 
            required: ['riderId', 'lat', 'lng'] 
          })
        };
      }

      console.log(`更新骑手 ${riderId} 的位置:`, { lat, lng, address });

      // 验证坐标范围（仰光市大致范围）
      if (lat < 16.7 || lat > 17.0 || lng < 96.0 || lng > 96.3) {
        console.warn(`骑手 ${riderId} 的位置坐标超出仰光市范围:`, { lat, lng });
      }

      const updatedLocation = updateRiderLocation(riderId, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: address || `位置: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
        speed: speed ? parseFloat(speed) : undefined,
        heading: heading ? parseFloat(heading) : undefined,
        deviceId,
        batteryLevel: batteryLevel ? parseInt(batteryLevel) : undefined
      });

      console.log(`骑手 ${riderId} 位置更新成功:`, updatedLocation);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '位置更新成功',
          location: updatedLocation
        })
      };
    }

    if (httpMethod === 'DELETE') {
      // 清除骑手位置信息
      const riderId = queryParams.get('riderId');
      
      if (!riderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '缺少骑手ID' })
        };
      }

      const deleted = riderLocations.delete(riderId);
      
      console.log(`${deleted ? '成功删除' : '未找到'} 骑手 ${riderId} 的位置信息`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: deleted,
          message: deleted ? '位置信息删除成功' : '未找到位置信息'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '不支持的请求方法' })
    };

  } catch (error) {
    console.error('骑手位置API错误:', error);
    
    // 如果是GET请求失败，返回模拟数据
    if (httpMethod === 'GET') {
      console.log('API异常，返回模拟位置数据');
      
      const mockLocations: RiderLocation[] = [
        {
          riderId: 'MDY1209251',
          lat: 16.8661,
          lng: 96.1951,
          address: '仰光市中心区',
          accuracy: 8,
          speed: 15,
          heading: 45,
          lastUpdate: new Date().toISOString(),
          batteryLevel: 85
        },
        {
          riderId: 'MDY1209252', 
          lat: 16.8701,
          lng: 96.2001,
          address: '仰光市商业区',
          accuracy: 5,
          speed: 25,
          heading: 180,
          lastUpdate: new Date().toISOString(),
          batteryLevel: 65
        },
        {
          riderId: 'MDY1209253',
          lat: 16.8541,
          lng: 96.1851,
          address: '仰光市港口区',
          accuracy: 12,
          speed: 0,
          heading: 0,
          lastUpdate: new Date().toISOString(),
          batteryLevel: 45
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(queryParams.get('riderId') ? mockLocations[0] : mockLocations)
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '服务器内部错误', 
        details: error.message 
      })
    };
  }
};
