import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 计算距离函数 (米)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 违规检测与配送行为记录函数
 * 
 * 逻辑优化：
 * 1. 记录所有手动点击“确认送达”的行为
 * 2. 重点标记距离送货点 > 200米的异常行为
 * 3. 记录照片上传状态
 */
export async function detectViolationsAsync(
  packageId: string,
  courierId: string,
  courierLat: number,
  courierLng: number
): Promise<void> {
  try {
    console.log('🔍 [配送行为检测]', { packageId, courierId, courierLat, courierLng });

    // 1. 获取包裹详情（带重试逻辑，确保获取到最新分配的骑手姓名）
    let packageData = null;
    let retryCount = 0;
    while (retryCount < 3) {
      const { data, error } = await supabase
        .from('packages')
        .select('receiver_latitude, receiver_longitude, courier, sender_address, receiver_address')
        .eq('id', packageId)
        .single();
      
      if (data && data.courier) {
        packageData = data;
        break;
      }
      
      console.log(`⏳ [行为检测] 等待包裹数据同步 (重试 ${retryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }

    if (!packageData) {
      console.error('❌ [行为检测] 无法获取完整的包裹数据或骑手未绑定');
      return;
    }

    const courierName = packageData.courier || '未知骑手';
    const destLat = Number(packageData.receiver_latitude || 0);
    const destLng = Number(packageData.receiver_longitude || 0);
    const cLat = Number(courierLat);
    const cLng = Number(courierLng);

    // 计算距离
    let distance = 0;
    if (destLat !== 0 && destLng !== 0 && cLat !== 0 && cLng !== 0) {
      distance = calculateDistance(cLat, cLng, destLat, destLng);
    }
    
    console.log(`📍 [距离计算] 订单: ${packageId}, 距离: ${Math.round(distance)}m`);

    // 2. 记录“确认送达”行为（所有手动点击均记录）
    const isLocationAnomaly = distance > 200; // 优化：距离阈值改为 200 米
    
    const alertData = {
      package_id: packageId,
      courier_id: courierId,
      courier_name: courierName,
      alert_type: isLocationAnomaly ? 'location_violation' : 'delivery_confirmation',
      severity: isLocationAnomaly ? (distance > 1000 ? 'critical' : 'high') : 'low',
      title: isLocationAnomaly ? '位置异常 - 确认送达点过远' : '确认送达 - 骑手操作记录',
      description: isLocationAnomaly 
        ? `骑手在距离收件地址 ${Math.round(distance)} 米处完成配送，超出200米安全范围`
        : `骑手已手动点击确认送达 (距离目标: ${Math.round(distance)}米)`,
      status: 'pending',
      courier_latitude: cLat,
      courier_longitude: cLng,
      destination_latitude: destLat,
      destination_longitude: destLng,
      distance_from_destination: distance,
      action_attempted: 'complete_delivery',
      metadata: {
        auto_detected: true,
        detection_time: new Date().toISOString(),
        is_manual_click: true,
        distance_meters: Math.round(distance)
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error: alertError } = await supabase
      .from('delivery_alerts')
      .insert(alertData)
      .select();

    if (alertError) {
      console.error('❌ [行为检测] 创建记录失败:', alertError.message);
    } else {
      console.log('✅ [行为检测] 配送行为已记录!', insertedData?.[0]?.id);
    }

    // 3. 检测照片违规（延迟 8 秒检测，确保图片已上传成功）
    setTimeout(async () => {
      try {
        console.log('📸 [照片检测] 订单:', packageId);
        const { data: photos, error: photoError } = await supabase
          .from('delivery_photos')
          .select('id')
          .eq('package_id', packageId);

        if (photoError) {
          console.error('❌ [行为检测] 查询照片失败:', photoError.message);
          return;
        }

        if (!photos || photos.length === 0) {
          console.warn('⚠️ [检测到照片缺失]', packageId);
          const photoAlertData = {
            package_id: packageId,
            courier_id: courierId,
            courier_name: courierName,
            alert_type: 'photo_violation',
            severity: 'medium',
            title: '照片违规 - 未上传配送照片',
            description: '骑手完成配送但未上传配送照片，无法提供配送证明',
            status: 'pending',
            courier_latitude: cLat,
            courier_longitude: cLng,
            action_attempted: 'complete_delivery',
            metadata: {
              auto_detected: true,
              detection_time: new Date().toISOString()
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: photoAlertError } = await supabase
            .from('delivery_alerts')
            .insert(photoAlertData);

          if (photoAlertError) {
            console.error('❌ [行为检测] 创建照片警报失败:', photoAlertError.message);
          } else {
            console.log('✅ [行为检测] 照片违规警报已创建!');
          }
        }
      } catch (err) {
        console.error('❌ [行为检测] 照片检测异常:', err);
      }
    }, 8000);

  } catch (error: any) {
    console.error('❌ [行为检测] 核心流程异常:', error.message);
  }
}
