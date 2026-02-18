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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 违规检测函数
export async function detectViolationsAsync(
  packageId: string,
  courierId: string,
  courierLat: number,
  courierLng: number
): Promise<void> {
  try {
    console.log('🔍 [开始违规检测]', { packageId, courierId, courierLat, courierLng });

    // 1. 获取包裹详情（带重试逻辑，确保获取到最新分配的骑手姓名）
    let packageData = null;
    let retryCount = 0;
    while (retryCount < 3) {
      const { data, error } = await supabase
        .from('packages')
        .select('receiver_latitude, receiver_longitude, courier')
        .eq('id', packageId)
        .single();
      
      if (data && data.courier) {
        packageData = data;
        break;
      }
      
      console.log(`⏳ [违规检测] 等待包裹数据同步 (重试 ${retryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }

    if (!packageData) {
      console.error('❌ [违规检测] 无法获取完整的包裹数据或骑手未绑定');
      return;
    }

    const courierName = packageData.courier || '未知骑手';

    // 2. 检测位置违规
    if (packageData.receiver_latitude && packageData.receiver_longitude) {
      const destLat = Number(packageData.receiver_latitude);
      const destLng = Number(packageData.receiver_longitude);
      const cLat = Number(courierLat);
      const cLng = Number(courierLng);

      const distance = calculateDistance(cLat, cLng, destLat, destLng);
      console.log(`📍 [距离计算] 订单: ${packageId}, 距离: ${Math.round(distance)}m`);

      if (distance > 100) {
        console.warn('⚠️ [检测到位置违规]', { distance });
        const alertData = {
          package_id: packageId,
          courier_id: courierId,
          courier_name: courierName,
          alert_type: 'location_violation',
          severity: distance > 1000 ? 'critical' : 'high',
          title: '位置违规 - 距离收件地址过远',
          description: `骑手在距离收件地址 ${Math.round(distance)} 米处完成配送，超出100米安全范围`,
          status: 'pending',
          courier_latitude: courierLat,
          courier_longitude: courierLng,
          destination_latitude: destLat,
          destination_longitude: destLng,
          distance_from_destination: distance,
          action_attempted: 'complete_delivery',
          metadata: {
            auto_detected: true,
            detection_time: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertedData, error: alertError } = await supabase
          .from('delivery_alerts')
          .insert(alertData)
          .select();

        if (alertError) {
          console.error('❌ [违规检测] 创建位置警报失败:', alertError.message, alertError.details);
        } else {
          console.log('✅ [违规检测] 位置违规警报创建成功!', insertedData?.[0]?.id);
        }
      } else {
        console.log('✅ [违规检测] 位置验证通过:', { distance });
      }
    } else {
      console.warn('⚠️ [违规检测] 包裹缺少收件地址坐标');
    }

    // 3. 检测照片违规（延迟 8 秒检测，确保图片已上传成功）
    setTimeout(async () => {
      try {
        console.log('📸 [开始照片检测]', packageId);
        const { data: photos, error: photoError } = await supabase
          .from('delivery_photos')
          .select('id')
          .eq('package_id', packageId);

        if (photoError) {
          console.error('❌ [违规检测] 查询照片失败:', photoError.message);
          return;
        }

        if (!photos || photos.length === 0) {
          console.warn('⚠️ [检测到照片违规]', packageId);
          const alertData = {
            package_id: packageId,
            courier_id: courierId,
            courier_name: courierName,
            alert_type: 'photo_violation',
            severity: 'medium',
            title: '照片违规 - 未上传配送照片',
            description: '骑手完成配送但未上传配送照片，无法提供配送证明',
            status: 'pending',
            courier_latitude: courierLat,
            courier_longitude: courierLng,
            action_attempted: 'complete_delivery',
            metadata: {
              auto_detected: true,
              detection_time: new Date().toISOString()
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: insertedPhotoData, error: alertError } = await supabase
            .from('delivery_alerts')
            .insert(alertData)
            .select();

          if (alertError) {
            console.error('❌ [违规检测] 创建照片警报失败:', alertError.message, alertError.details);
          } else {
            console.log('✅ [违规检测] 照片违规警报创建成功!', insertedPhotoData?.[0]?.id);
          }
        }
      } catch (err) {
        console.error('❌ [违规检测] 照片检测异常:', err);
      }
    }, 8000);

  } catch (error: any) {
    console.error('❌ [违规检测] 核心流程异常:', error.message);
  }
}
