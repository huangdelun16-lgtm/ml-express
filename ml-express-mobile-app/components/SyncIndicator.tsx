import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cacheService } from '../services/cacheService';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { formatI18n } from '../utils/i18n';

export const SyncIndicator = () => {
  const { t } = useApp();
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    const checkQueue = async () => {
      const queue = await cacheService.getOfflineQueue();
      setPendingCount(queue.length);
      
      if (queue.length > 0) {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      checkQueue();
    });

    const interval = setInterval(checkQueue, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (pendingCount === 0) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={formatI18n(isOnline ? t.syncInProgress : t.syncPending, { count: pendingCount })}
    >
      <View style={[styles.badge, !isOnline && styles.offlineBadge]} accessible={false}>
        <Ionicons 
          name={isOnline ? "sync" : "cloud-offline"} 
          size={14} 
          color="white" 
          style={isOnline ? styles.spin : undefined}
        />
        <Text style={styles.text}>
          {formatI18n(isOnline ? t.syncInProgress : t.syncPending, { count: pendingCount })}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 9999,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  offlineBadge: {
    backgroundColor: '#64748b',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spin: {
    // 简单的旋转效果可以通过外部动画实现，这里先保持静态
  }
});
