import { useState, useEffect, useCallback, useRef } from 'react';
import { trackingService, TrackingEvent, CourierLocation, Package } from '../services/supabase';
import { getCourierLocations } from '../api/courierLocation';

export interface UseRealTimeTrackingOptions {
  refreshInterval?: number; // 数据刷新间隔（毫秒）
  autoRefresh?: boolean; // 是否自动刷新
  selectedPackageId?: string; // 选中的包裹ID
}

export interface RealTimeTrackingState {
  packages: Package[];
  courierLocations: CourierLocation[];
  trackingEvents: TrackingEvent[];
  couriers: any[]; // 添加骑手详细信息
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * 实时跟踪自定义Hook
 * 提供自动数据刷新和状态管理
 */
export const useRealTimeTracking = (options: UseRealTimeTrackingOptions = {}) => {
  const {
    refreshInterval = 15000, // 默认15秒刷新一次
    autoRefresh = true,
    selectedPackageId
  } = options;

  const [state, setState] = useState<RealTimeTrackingState>({
    packages: [],
    courierLocations: [],
    trackingEvents: [],
    couriers: [], // 初始化骑手数组
    loading: false,
    error: null,
    lastUpdate: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 加载所有数据
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // 并行加载数据
      const [packagesResult, courierLocationsResult, couriersResult, trackingEventsResult] = await Promise.allSettled([
        trackingService.getActivePackages(),
        getCourierLocations(),
        trackingService.getActiveCouriers(), // 获取骑手详细信息
        selectedPackageId ? trackingService.getTrackingEvents(selectedPackageId) : Promise.resolve([])
      ]);

      if (!mountedRef.current) return;

      let packages: Package[] = [];
      let courierLocations: CourierLocation[] = [];
      let couriers: any[] = [];
      let trackingEvents: TrackingEvent[] = [];
      let errors: string[] = [];

      // 处理包裹数据
      if (packagesResult.status === 'fulfilled') {
        packages = packagesResult.value;
      } else {
        errors.push(`包裹数据加载失败: ${packagesResult.reason}`);
      }

      // 处理骑手位置数据
      if (courierLocationsResult.status === 'fulfilled' && courierLocationsResult.value.success) {
        courierLocations = courierLocationsResult.value.data || [];
      } else {
        const errorMsg = courierLocationsResult.status === 'fulfilled' 
          ? courierLocationsResult.value.error 
          : courierLocationsResult.reason;
        errors.push(`骑手位置数据加载失败: ${errorMsg}`);
      }

      // 处理骑手详细信息
      if (couriersResult.status === 'fulfilled') {
        couriers = couriersResult.value;
      } else {
        errors.push(`骑手信息加载失败: ${couriersResult.reason}`);
      }

      // 处理跟踪事件数据
      if (trackingEventsResult.status === 'fulfilled') {
        trackingEvents = trackingEventsResult.value;
      } else if (selectedPackageId) {
        errors.push(`跟踪事件数据加载失败: ${trackingEventsResult.reason}`);
      }

      setState({
        packages,
        courierLocations,
        couriers,
        trackingEvents,
        loading: false,
        error: errors.length > 0 ? errors.join('; ') : null,
        lastUpdate: new Date()
      });

    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('数据加载错误:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '数据加载失败'
      }));
    }
  }, [selectedPackageId]);

  // 手动刷新数据
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // 初始化骑手数据
  const initializeCourierData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await trackingService.initializeCourierLocations();
      await loadData();
    } catch (error) {
      console.error('初始化骑手数据失败:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '初始化失败'
      }));
    }
  }, [loadData]);

  // 模拟骑手移动
  const simulateCourierMovement = useCallback(async () => {
    try {
      const activeCouriers = state.courierLocations.filter(loc => loc.status === 'online');
      
      if (activeCouriers.length === 0) {
        setState(prev => ({ ...prev, error: '没有在线的骑手可以模拟移动' }));
        return;
      }

      // 随机选择一个骑手进行移动模拟
      const randomCourier = activeCouriers[Math.floor(Math.random() * activeCouriers.length)];
      await trackingService.simulateCourierMovement(randomCourier.courier_id);
      
      // 刷新数据以显示更新
      await loadData();
    } catch (error) {
      console.error('模拟骑手移动失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '模拟移动失败'
      }));
    }
  }, [state.courierLocations, loadData]);

  // 设置自动刷新
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        loadData();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [autoRefresh, refreshInterval, loadData]);

  // 初始数据加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 当选中包裹变化时重新加载跟踪事件
  useEffect(() => {
    if (selectedPackageId) {
      trackingService.getTrackingEvents(selectedPackageId)
        .then(events => {
          if (mountedRef.current) {
            setState(prev => ({ ...prev, trackingEvents: events }));
          }
        })
        .catch(error => {
          if (mountedRef.current) {
            console.error('加载跟踪事件失败:', error);
          }
        });
    } else {
      setState(prev => ({ ...prev, trackingEvents: [] }));
    }
  }, [selectedPackageId]);

  // 清理函数
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refreshData,
    initializeCourierData,
    simulateCourierMovement,
    isAutoRefreshing: autoRefresh && !!intervalRef.current
  };
};

export default useRealTimeTracking;