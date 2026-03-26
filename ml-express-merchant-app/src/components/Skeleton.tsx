import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width: skeletonWidth = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f0f0f0', '#e0e0e0'],
  });

  return (
    <Animated.View
      style={[
        {
          width: skeletonWidth,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// 订单卡片骨架屏
export const OrderCardSkeleton: React.FC = () => (
  <View style={styles.orderCardSkeleton}>
    <View style={styles.orderCardHeader}>
      <Skeleton width={120} height={16} />
      <Skeleton width={60} height={16} borderRadius={12} />
    </View>
    <View style={styles.orderCardBody}>
      <Skeleton width={200} height={14} style={{ marginBottom: 8 }} />
      <Skeleton width={150} height={14} />
    </View>
    <View style={styles.orderCardFooter}>
      <Skeleton width={80} height={16} />
      <Skeleton width={60} height={14} />
    </View>
  </View>
);

// 首页统计卡片骨架屏
export const StatsCardSkeleton: React.FC = () => (
  <View style={styles.statsCardSkeleton}>
    <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
    <Skeleton width={60} height={20} style={{ marginBottom: 4 }} />
    <Skeleton width={40} height={14} />
  </View>
);

// 表单输入框骨架屏
export const InputSkeleton: React.FC<{ label?: boolean }> = ({ label = true }) => (
  <View style={styles.inputSkeleton}>
    {label && <Skeleton width={80} height={16} style={{ marginBottom: 8 }} />}
    <Skeleton width="100%" height={48} borderRadius={8} />
  </View>
);

// 列表项骨架屏
export const ListItemSkeleton: React.FC = () => (
  <View style={styles.listItemSkeleton}>
    <Skeleton width={50} height={50} borderRadius={25} style={{ marginRight: 12 }} />
    <View style={styles.listItemContent}>
      <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
      <Skeleton width={200} height={14} style={{ marginBottom: 4 }} />
      <Skeleton width={80} height={12} />
    </View>
    <Skeleton width={60} height={16} borderRadius={12} />
  </View>
);

// 按钮骨架屏
export const ButtonSkeleton: React.FC<{ width?: number | string }> = ({ width = '100%' }) => (
  <Skeleton width={width} height={48} borderRadius={8} />
);

// 图片骨架屏
export const ImageSkeleton: React.FC<{ width?: number; height?: number; borderRadius?: number }> = ({ 
  width: imageWidth = 100, 
  height = 100, 
  borderRadius = 8 
}) => (
  <Skeleton width={imageWidth} height={height} borderRadius={borderRadius} />
);

// 文本骨架屏
export const TextSkeleton: React.FC<{ lines?: number; width?: number | string }> = ({ 
  lines = 1, 
  width: textWidth = '100%' 
}) => (
  <View>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        width={textWidth}
        height={16}
        style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
      />
    ))}
  </View>
);

// 卡片骨架屏
export const CardSkeleton: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.cardSkeleton}>
    {children}
  </View>
);

// 网格骨架屏
export const GridSkeleton: React.FC<{ 
  columns?: number; 
  itemHeight?: number; 
  spacing?: number 
}> = ({ 
  columns = 2, 
  itemHeight = 120, 
  spacing = 10 
}) => (
  <View style={styles.gridSkeleton}>
    {Array.from({ length: 6 }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.gridItem,
          {
            width: (width - spacing * (columns + 1)) / columns,
            height: itemHeight,
            marginRight: (index + 1) % columns === 0 ? 0 : spacing,
            marginBottom: spacing,
          },
        ]}
      >
        <Skeleton width="100%" height="100%" borderRadius={8} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  orderCardSkeleton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardBody: {
    marginBottom: 12,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCardSkeleton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputSkeleton: {
    marginBottom: 16,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
  },
  listItemContent: {
    flex: 1,
  },
  cardSkeleton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  gridItem: {
    borderRadius: 8,
  },
});

export default Skeleton;
