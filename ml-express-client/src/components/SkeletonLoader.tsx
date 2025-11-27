import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const SkeletonItem: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  style,
  borderRadius = 4,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

export const OrderSkeleton: React.FC = () => {
  return (
    <View style={styles.orderCard}>
      <View style={styles.header}>
        <SkeletonItem width={120} height={16} />
        <SkeletonItem width={60} height={24} borderRadius={12} />
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <SkeletonItem width={20} height={20} borderRadius={10} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <SkeletonItem width="40%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonItem width="80%" height={14} />
        </View>
      </View>
      <View style={[styles.row, { marginTop: 16 }]}>
        <SkeletonItem width={20} height={20} borderRadius={10} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <SkeletonItem width="40%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonItem width="80%" height={14} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <SkeletonItem width={80} height={14} />
        <SkeletonItem width={60} height={18} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});

