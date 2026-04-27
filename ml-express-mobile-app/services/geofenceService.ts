// 地理围栏服务
// 用于检测骑手是否在收件地址100米范围内

import * as Location from 'expo-location';
import { supabase } from './supabase';
import { requestForegroundPermissionsIfDisclosed } from '../utils/locationPermissionGate';

export interface GeofenceResult {
  isWithinRange: boolean;
  distance: number; // 距离（米）
  courierLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  destinationLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface DeliveryAlert {
  id?: string;
  package_id: string;
  courier_id: string;
  courier_name: string;
  alert_type: 'distance_violation' | 'suspicious_location' | 'time_violation' | 'no_photo' | 'location_unavailable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  courier_latitude: number;
  courier_longitude: number;
  destination_latitude?: number;
  destination_longitude?: number;
  distance_from_destination?: number;
  title: string;
  description: string;
  action_attempted?: string;
  status?: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  metadata?: any;
}

class GeofenceService {
  private readonly DELIVERY_RADIUS_METERS = 50; // 🚀 送达判定半径缩短至 50 米
  private readonly MERCHANT_RADIUS_METERS = 100; // 🚀 商家到达判定半径 100 米
  private readonly SUSPICIOUS_DISTANCE_METERS = 500; // 超过500米视为可疑
  private readonly CRITICAL_DISTANCE_METERS = 1000; // 超过1000米视为紧急

  /**
   * 自动检测是否到达商家（取件点）
   */
  async checkArrivedAtMerchant(merchantLat: number, merchantLon: number): Promise<boolean> {
    const currentLocation = await this.getCurrentLocation();
    if (!currentLocation) return false;

    const distance = this.calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      merchantLat,
      merchantLon
    );

    return distance <= this.MERCHANT_RADIUS_METERS;
  }

  /**
   * 计算两点之间的距离（哈弗辛公式）
   * @returns 距离（米）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 距离（米）
  }

  /**
   * 获取当前位置
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      // 检查权限
      const { status } = await requestForegroundPermissionsIfDisclosed();
      if (status !== 'granted') {
        console.error('位置权限未授予');
        return null;
      }

      // 获取当前位置（高精度）
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      return location;
    } catch (error) {
      console.error('获取位置失败:', error);
      return null;
    }
  }

  /**
   * 检查是否在地理围栏内
   */
  async checkGeofence(
    destinationLat: number,
    destinationLon: number
  ): Promise<GeofenceResult> {
    const currentLocation = await this.getCurrentLocation();

    if (!currentLocation) {
      return {
        isWithinRange: false,
        distance: -1,
        courierLocation: { latitude: 0, longitude: 0 },
      };
    }

    const distance = this.calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      destinationLat,
      destinationLon
    );

    return {
      isWithinRange: distance <= this.DELIVERY_RADIUS_METERS,
      distance: Math.round(distance), // 四舍五入到整数
      courierLocation: {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      },
      destinationLocation: {
        latitude: destinationLat,
        longitude: destinationLon,
      },
    };
  }

  /**
   * 创建配送警报
   */
  async createDeliveryAlert(alert: DeliveryAlert): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('delivery_alerts')
        .insert({
          package_id: alert.package_id,
          courier_id: alert.courier_id,
          courier_name: alert.courier_name,
          alert_type: alert.alert_type,
          severity: alert.severity,
          courier_latitude: alert.courier_latitude,
          courier_longitude: alert.courier_longitude,
          destination_latitude: alert.destination_latitude,
          destination_longitude: alert.destination_longitude,
          distance_from_destination: alert.distance_from_destination,
          title: alert.title,
          description: alert.description,
          action_attempted: alert.action_attempted || 'mark_delivered',
          status: alert.status || 'pending',
          metadata: alert.metadata || {},
        });

      if (error) {
        console.error('创建警报失败:', error);
        return false;
      }

      console.log('警报创建成功:', data);
      return true;
    } catch (error) {
      console.error('创建警报异常:', error);
      return false;
    }
  }

  /**
   * 验证送达操作（主要方法）
   */
  async validateDelivery(
    packageId: string,
    courierId: string,
    courierName: string,
    destinationLat?: number,
    destinationLon?: number
  ): Promise<{
    allowed: boolean;
    result: GeofenceResult;
    alertCreated: boolean;
    message: string;
  }> {
    // 1. 检查是否有目标坐标
    if (!destinationLat || !destinationLon) {
      // 没有目标坐标，创建警报但允许操作（降级处理）
      const currentLocation = await this.getCurrentLocation();
      
      if (currentLocation) {
        await this.createDeliveryAlert({
          package_id: packageId,
          courier_id: courierId,
          courier_name: courierName,
          alert_type: 'location_unavailable',
          severity: 'medium',
          courier_latitude: currentLocation.coords.latitude,
          courier_longitude: currentLocation.coords.longitude,
          title: '⚠️ 目标地址坐标缺失',
          description: `骑手 ${courierName} 标记包裹 ${packageId} 为已送达，但系统中没有收件地址的精确坐标，无法验证送达位置。`,
          action_attempted: 'mark_delivered',
          metadata: {
            reason: 'missing_destination_coordinates',
            courier_accuracy: currentLocation.coords.accuracy,
          },
        });
      }

      return {
        allowed: true, // 允许但会记录
        result: {
          isWithinRange: true, // 降级为允许
          distance: -1,
          courierLocation: currentLocation
            ? {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy || undefined,
              }
            : { latitude: 0, longitude: 0 },
        },
        alertCreated: true,
        message: '⚠️ 无法验证送达位置（缺少目标坐标），但已记录到系统',
      };
    }

    // 2. 检查地理围栏
    const geofenceResult = await this.checkGeofence(destinationLat, destinationLon);

    // 3. 如果无法获取位置
    if (geofenceResult.distance === -1) {
      await this.createDeliveryAlert({
        package_id: packageId,
        courier_id: courierId,
        courier_name: courierName,
        alert_type: 'location_unavailable',
        severity: 'high',
        courier_latitude: 0,
        courier_longitude: 0,
        destination_latitude: destinationLat,
        destination_longitude: destinationLon,
        title: '🚨 无法获取骑手位置',
        description: `骑手 ${courierName} 尝试标记包裹 ${packageId} 为已送达，但系统无法获取骑手当前位置（GPS未启用或权限被拒绝）。`,
        action_attempted: 'mark_delivered',
        metadata: {
          reason: 'location_service_unavailable',
        },
      });

      return {
        allowed: false,
        result: geofenceResult,
        alertCreated: true,
        message: '❌ 无法获取您的位置，请检查GPS设置并授予位置权限',
      };
    }

    // 4. 在范围内 - 允许送达
    if (geofenceResult.isWithinRange) {
      return {
        allowed: true,
        result: geofenceResult,
        alertCreated: false,
        message: `✅ 位置验证通过（距离收件地址 ${geofenceResult.distance} 米）`,
      };
    }

    // 5. 超出范围 - 创建警报并拒绝
    const distance = geofenceResult.distance;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let alertType: 'distance_violation' | 'suspicious_location' = 'distance_violation';

    if (distance > this.CRITICAL_DISTANCE_METERS) {
      severity = 'critical';
      alertType = 'suspicious_location';
    } else if (distance > this.SUSPICIOUS_DISTANCE_METERS) {
      severity = 'high';
      alertType = 'suspicious_location';
    } else {
      severity = 'medium';
      alertType = 'distance_violation';
    }

    await this.createDeliveryAlert({
      package_id: packageId,
      courier_id: courierId,
      courier_name: courierName,
      alert_type: alertType,
      severity: severity,
      courier_latitude: geofenceResult.courierLocation.latitude,
      courier_longitude: geofenceResult.courierLocation.longitude,
      destination_latitude: destinationLat,
      destination_longitude: destinationLon,
      distance_from_destination: distance,
      title: `🚨 ${severity === 'critical' ? '紧急' : '距离违规'}警报`,
      description: `骑手 ${courierName} 在距离收件地址 ${distance?.toFixed(0) || 'N/A'} 米处尝试标记包裹 ${packageId} 为已送达（超出允许范围 ${this.DELIVERY_RADIUS_METERS} 米）。\n\n骑手位置: ${geofenceResult.courierLocation?.latitude?.toFixed(6) || 'N/A'}, ${geofenceResult.courierLocation?.longitude?.toFixed(6) || 'N/A'}\n收件地址: ${destinationLat?.toFixed(6) || 'N/A'}, ${destinationLon?.toFixed(6) || 'N/A'}\n定位精度: ${geofenceResult.courierLocation?.accuracy?.toFixed(0) || '未知'} 米`,
      action_attempted: 'mark_delivered',
      metadata: {
        courier_location: geofenceResult.courierLocation,
        destination_location: geofenceResult.destinationLocation,
        distance_meters: distance,
        required_range_meters: this.DELIVERY_RADIUS_METERS,
        location_accuracy: geofenceResult.courierLocation.accuracy,
      },
    });

    return {
      allowed: false,
      result: geofenceResult,
      alertCreated: true,
      message: `❌ 您距离收件地址还有 ${distance?.toFixed(0) || 'N/A'} 米\n必须在 ${this.DELIVERY_RADIUS_METERS} 米范围内才能标记已送达\n\n⚠️ 此异常操作已记录并通知管理员`,
    };
  }

  /**
   * 获取待处理警报数量
   */
  async getPendingAlertsCount(): Promise<number> {
    try {
      const { data, error, count } = await supabase
        .from('delivery_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        console.error('查询警报数量失败:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('查询警报数量异常:', error);
      return 0;
    }
  }

  /**
   * 获取所有警报
   */
  async getAllAlerts(status?: string): Promise<DeliveryAlert[]> {
    try {
      let query = supabase
        .from('delivery_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('查询警报失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('查询警报异常:', error);
      return [];
    }
  }

  /**
   * 更新警报状态
   */
  async updateAlertStatus(
    alertId: string,
    status: 'acknowledged' | 'resolved' | 'dismissed',
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('delivery_alerts')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes || '',
        })
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
}

export const geofenceService = new GeofenceService();

