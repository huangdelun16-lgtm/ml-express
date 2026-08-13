import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

export default function Toast({
  message,
  type = 'info',
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => hideToast(), duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const backgroundColor =
    type === 'success'
      ? '#059669'
      : type === 'error'
        ? '#dc2626'
        : type === 'warning'
          ? '#d97706'
          : '#2563eb';

  const icon =
    type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12) + 8,
          opacity,
          transform: [{ translateY }],
          backgroundColor,
          maxWidth: Math.min(width - 32, 480),
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    fontSize: 18,
    color: '#ffffff',
    marginRight: 12,
    fontWeight: '700',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 20,
  },
});
