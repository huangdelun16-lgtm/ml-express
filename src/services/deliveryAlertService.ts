import { supabase } from './supabase';

// 配送警报接口
export interface DeliveryAlert {
  id: string;
  package_id: string;
  courier_id: string;
  courier_name: string;
  alert_type: string;
  severity: string;
  courier_latitude: number;
  courier_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  distance_from_destination?: number;
  title: string;
  description: string;
  action_attempted?: string;
  status: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  violation_type?: string;
  penalty_points?: number;
  warning_level?: string;
  admin_action?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// 位置验证结果
export interface LocationValidationResult {
  isValid: boolean;
  distance: number;
  isWithinRange: boolean;
  courierLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
}

// 照片验证结果
export interface PhotoValidationResult {
  hasPhoto: boolean;
  photoCount: number;
  photoUrls: string[];
  lastPhotoTime?: string;
}

// 计算两点间距离（米）
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 配送警报检测服务
export const deliveryAlertService = {
  // 检测位置违规
  async checkLocationViolation(
    packageId: string,
    courierId: string,
    courierLat: number,
    courierLng: number,
    actionType: string = 'complete_delivery'
  ): Promise<LocationValidationResult> {
    try {
      // 获取包裹信息
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('receiver_latitude, receiver_longitude, receiver_address')
        .eq('id', packageId)
        .single();

      if (packageError || !packageData) {
        console.error('获取包裹信息失败:', packageError);
        return {
          isValid: false,
          distance: 0,
          isWithinRange: false,
          courierLocation: { lat: courierLat, lng: courierLng },
          destinationLocation: { lat: 0, lng: 0 }
        };
      }

      const destLat = packageData.receiver_latitude;
      const destLng = packageData.receiver_longitude;

      if (!destLat || !destLng) {
        console.warn('包裹缺少收件地址坐标');
        return {
          isValid: false,
          distance: 0,
          isWithinRange: false,
          courierLocation: { lat: courierLat, lng: courierLng },
          destinationLocation: { lat: 0, lng: 0 }
        };
      }

      // 计算距离
      const distance = calculateDistance(courierLat, courierLng, destLat, destLng);
      const isWithinRange = distance <= 100; // 100米范围内

      return {
        isValid: true,
        distance,
        isWithinRange,
        courierLocation: { lat: courierLat, lng: courierLng },
        destinationLocation: { lat: destLat, lng: destLng }
      };
    } catch (error) {
      console.error('位置验证失败:', error);
      return {
        isValid: false,
        distance: 0,
        isWithinRange: false,
        courierLocation: { lat: courierLat, lng: courierLng },
        destinationLocation: { lat: 0, lng: 0 }
      };
    }
  },

  // 检测照片违规
  async checkPhotoViolation(packageId: string): Promise<PhotoValidationResult> {
    try {
      // 获取配送照片
      const { data: photos, error: photoError } = await supabase
        .from('delivery_photos')
        .select('photo_url, created_at')
        .eq('package_id', packageId)
        .order('created_at', { ascending: false });

      if (photoError) {
        console.error('获取配送照片失败:', photoError);
        return {
          hasPhoto: false,
          photoCount: 0,
          photoUrls: []
        };
      }

      const photoUrls = photos?.map(p => p.photo_url).filter(url => url) || [];
      const hasPhoto = photoUrls.length > 0;
      const lastPhotoTime = photos?.[0]?.created_at;

      return {
        hasPhoto,
        photoCount: photoUrls.length,
        photoUrls,
        lastPhotoTime
      };
    } catch (error) {
      console.error('照片验证失败:', error);
      return {
        hasPhoto: false,
        photoCount: 0,
        photoUrls: []
      };
    }
  },

  // 创建配送警报
  async createDeliveryAlert(
    packageId: string,
    courierId: string,
    alertType: string,
    severity: string,
    title: string,
    description: string,
    metadata: any = {}
  ): Promise<boolean> {
    try {
      // 获取骑手信息
      const { data: courierData, error: courierError } = await supabase
        .from('couriers')
        .select('name')
        .eq('id', courierId)
        .single();

      if (courierError || !courierData) {
        console.error('获取骑手信息失败:', courierError);
        return false;
      }

      // 创建警报记录
      const alertData = {
        package_id: packageId,
        courier_id: courierId,
        courier_name: courierData.name,
        alert_type: alertType,
        severity: severity,
        title: title,
        description: description,
        status: 'pending',
        metadata: metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('delivery_alerts')
        .insert(alertData);

      if (insertError) {
        console.error('创建配送警报失败:', insertError);
        return false;
      }

      console.log('✅ 配送警报创建成功:', alertData);
      return true;
    } catch (error) {
      console.error('创建配送警报异常:', error);
      return false;
    }
  },

  // 自动检测并创建违规警报
  async autoDetectViolations(
    packageId: string,
    courierId: string,
    courierLat: number,
    courierLng: number,
    actionType: string = 'complete_delivery'
  ): Promise<void> {
    try {
      console.log('🔍 开始自动检测违规行为...', {
        packageId,
        courierId,
        actionType,
        courierLocation: { lat: courierLat, lng: courierLng }
      });

      // 1. 检测位置违规
      const locationResult = await this.checkLocationViolation(
        packageId,
        courierId,
        courierLat,
        courierLng,
        actionType
      );

      if (locationResult.isValid && !locationResult.isWithinRange) {
        console.warn('⚠️ 检测到位置违规:', {
          distance: locationResult.distance,
          isWithinRange: locationResult.isWithinRange
        });

        await this.createDeliveryAlert(
          packageId,
          courierId,
          'location_violation',
          'high',
          '位置违规 - 距离收件地址过远',
          `骑手在距离收件地址 ${locationResult.distance.toFixed(0)} 米处完成配送，超出100米安全范围`,
          {
            courier_latitude: courierLat,
            courier_longitude: courierLng,
            destination_latitude: locationResult.destinationLocation.lat,
            destination_longitude: locationResult.destinationLocation.lng,
            distance_from_destination: locationResult.distance,
            action_attempted: actionType
          }
        );
      }

      // 2. 检测照片违规（延迟5秒检测，给照片上传时间）
      setTimeout(async () => {
        const photoResult = await this.checkPhotoViolation(packageId);
        
        if (!photoResult.hasPhoto) {
          console.warn('⚠️ 检测到照片违规: 未上传配送照片');
          
          await this.createDeliveryAlert(
            packageId,
            courierId,
            'photo_violation',
            'medium',
            '照片违规 - 未上传配送照片',
            '骑手完成配送但未上传配送照片，无法提供配送证明',
            {
              courier_latitude: courierLat,
              courier_longitude: courierLng,
              action_attempted: actionType,
              photo_count: photoResult.photoCount
            }
          );
        }
      }, 5000);

    } catch (error) {
      console.error('❌ 自动检测违规行为失败:', error);
    }
  },

  // 获取所有配送警报
  async getAllAlerts(): Promise<DeliveryAlert[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取配送警报失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取配送警报异常:', error);
      return [];
    }
  },

  // 更新警报状态
  async updateAlertStatus(
    alertId: string,
    status: string,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = resolvedBy;
        updateData.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('delivery_alerts')
        .update(updateData)
        .eq('id', alertId);

      if (error) {
        console.error('更新警报状态失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新警报状态异常:', error);
      return false;
    }
  }
};
