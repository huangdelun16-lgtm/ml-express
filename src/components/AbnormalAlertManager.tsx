import React, { useState, useEffect, useRef } from 'react';
import { supabase, packageService } from '../services/supabase';

const AbnormalAlertManager: React.FC = () => {
  const [abnormalCount, setAbnormalCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 请求通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkAbnormalPackages = async () => {
      try {
        const data = await packageService.getAllPackages();
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        const abnormal = data.filter(pkg => {
          if (pkg.status !== '配送中' && pkg.status !== '配送进行中') return false;
          const lastUpdateTime = pkg.updated_at ? new Date(pkg.updated_at) : (pkg.created_at ? new Date(pkg.created_at) : null);
          return lastUpdateTime && lastUpdateTime < twoHoursAgo;
        });

        if (abnormal.length > abnormalCount) {
          // 播放提示音
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => {
              console.warn('播放提示音被拦截:', e);
            });
          }

          // 发送桌面通知
          if (Notification.permission === 'granted') {
            new Notification('⚠️ 配送超时警告', {
              body: `发现 ${abnormal.length} 个订单已超过 2 小时未更新位置，请及时处理。`,
              icon: '/favicon.ico',
              tag: 'abnormal-delivery-alert'
            });
          }
        }
        setAbnormalCount(abnormal.length);
      } catch (error) {
        console.error('检测异常订单失败:', error);
      }
    };

    // 每 5 分钟检查一次
    checkAbnormalPackages();
    checkTimerRef.current = setInterval(checkAbnormalPackages, 5 * 60 * 1000);

    return () => {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
    };
  }, [abnormalCount]);

  return (
    <audio 
      ref={audioRef} 
      src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
      preload="auto"
      style={{ display: 'none' }}
    />
  );
};

export default AbnormalAlertManager;

