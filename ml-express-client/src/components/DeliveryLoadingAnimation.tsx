import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeliveryLoadingAnimationProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showOverlay?: boolean;
}

export default function DeliveryLoadingAnimation({
  message = '加载中...',
  size = 'medium',
  showOverlay = true,
}: DeliveryLoadingAnimationProps) {
  // 动画值
  const truckPosition = useRef(new Animated.Value(-200)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const packageBounce = useRef(new Animated.Value(0)).current;
  const smokeOpacity = useRef(new Animated.Value(0)).current;
  const dotsAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 卡车移动动画
    const truckAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(truckPosition, {
          toValue: SCREEN_WIDTH + 100,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(truckPosition, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 车轮旋转动画
    const wheelAnimation = Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 包裹弹跳动画
    const packageAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(packageBounce, {
          toValue: -3,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(packageBounce, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 烟雾动画
    const smokeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(smokeOpacity, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(smokeOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    // 加载点动画
    const dotsAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    truckAnimation.start();
    wheelAnimation.start();
    packageAnimation.start();
    smokeAnimation.start();
    dotsAnim.start();

    return () => {
      truckAnimation.stop();
      wheelAnimation.stop();
      packageAnimation.stop();
      smokeAnimation.stop();
      dotsAnim.stop();
    };
  }, []);

  const wheelRotate = wheelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeStyles = {
    small: { scale: 0.6, containerHeight: 140 },
    medium: { scale: 1, containerHeight: 220 },
    large: { scale: 1.3, containerHeight: 280 },
  };

  const currentSize = sizeStyles[size];

  const containerStyle = showOverlay
    ? [styles.overlayContainer]
    : [styles.inlineContainer, { height: currentSize.containerHeight }];

  return (
    <View style={containerStyle}>
      {showOverlay && (
        <LinearGradient
          colors={['rgba(176, 211, 232, 0.95)', 'rgba(120, 149, 163, 0.95)']}
          style={styles.gradientOverlay}
        />
      )}

      <View style={[styles.animationContainer, { transform: [{ scale: currentSize.scale }] }]}>
        {/* 道路 */}
        <View style={styles.road}>
          <View style={styles.roadLine} />
        </View>

        {/* 卡车整体 */}
        <Animated.View
          style={[
            styles.truckContainer,
            {
              transform: [{ translateX: truckPosition }],
            },
          ]}
        >
          {/* 烟雾效果 */}
          <Animated.View
            style={[
              styles.smoke,
              {
                opacity: smokeOpacity,
              },
            ]}
          >
            <Text style={styles.smokeText}>💨</Text>
            <Text style={[styles.smokeText, { marginLeft: -8 }]}>💨</Text>
          </Animated.View>

          {/* 卡车车身 */}
          <View style={styles.truckBody}>
            {/* 货箱 */}
            <View style={styles.cargoBox}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cargoBoxGradient}
              >
                {/* 公司名称 - 第一行 */}
                <Text style={styles.companyName}>MARKET LINK</Text>
                {/* 公司名称 - 第二行 */}
                <Text style={styles.companyName}>EXPRESS</Text>
                
                {/* 货箱门的线条 */}
                <View style={styles.cargoBoxDoor} />
                
                {/* 包裹在货箱内 */}
                <Animated.View
                  style={[
                    styles.packageInside,
                    {
                      transform: [{ translateY: packageBounce }],
                    },
                  ]}
                >
                  <Text style={styles.packageText}>📦</Text>
                  <Text style={styles.packageText}>📦</Text>
                </Animated.View>
              </LinearGradient>
            </View>

            {/* 驾驶室 */}
            <View style={styles.cabin}>
              <LinearGradient
                colors={['#1e40af', '#1e3a8a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cabinGradient}
              >
                {/* 窗户 */}
                <View style={styles.window}>
                  <LinearGradient
                    colors={['#dbeafe', '#bfdbfe']}
                    style={styles.windowGlass}
                  />
                </View>
                
                {/* 司机 */}
                <Text style={styles.driver}>👨‍✈️</Text>
              </LinearGradient>
            </View>

            {/* 车轮 */}
            <View style={styles.wheelsContainer}>
              {/* 后轮 */}
              <Animated.View
                style={[
                  styles.wheel,
                  styles.backWheel,
                  {
                    transform: [{ rotate: wheelRotate }],
                  },
                ]}
              >
                <View style={styles.wheelOuter}>
                  <View style={styles.wheelInner}>
                    <View style={styles.wheelHub} />
                    <View style={styles.spoke} />
                    <View style={[styles.spoke, { transform: [{ rotate: '60deg' }] }]} />
                    <View style={[styles.spoke, { transform: [{ rotate: '120deg' }] }]} />
                  </View>
                </View>
              </Animated.View>

              {/* 前轮 */}
              <Animated.View
                style={[
                  styles.wheel,
                  styles.frontWheel,
                  {
                    transform: [{ rotate: wheelRotate }],
                  },
                ]}
              >
                <View style={styles.wheelOuter}>
                  <View style={styles.wheelInner}>
                    <View style={styles.wheelHub} />
                    <View style={styles.spoke} />
                    <View style={[styles.spoke, { transform: [{ rotate: '60deg' }] }]} />
                    <View style={[styles.spoke, { transform: [{ rotate: '120deg' }] }]} />
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* 加载文字 */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
          <View style={styles.dotsContainer}>
            <Animated.Text style={[styles.dot, { opacity: dotsAnimation }]}>●</Animated.Text>
            <Animated.Text
              style={[
                styles.dot,
                {
                  opacity: dotsAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                },
              ]}
            >
              ●
            </Animated.Text>
            <Animated.Text
              style={[
                styles.dot,
                {
                  opacity: dotsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ]}
            >
              ●
            </Animated.Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  animationContainer: {
    width: SCREEN_WIDTH,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  road: {
    position: 'absolute',
    bottom: 70,
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
  },
  roadLine: {
    position: 'absolute',
    top: -8,
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  truckContainer: {
    position: 'absolute',
    bottom: 60,
    width: 180,
    height: 100,
  },
  truckBody: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cargoBox: {
    position: 'absolute',
    left: 0,
    bottom: 20,
    width: 120,
    height: 65,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cargoBoxGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e40af',
    borderRadius: 4,
  },
  companyName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 13,
  },
  cargoBoxDoor: {
    position: 'absolute',
    right: 10,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  packageInside: {
    position: 'absolute',
    bottom: 5,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  packageText: {
    fontSize: 14,
  },
  cabin: {
    position: 'absolute',
    right: 0,
    bottom: 20,
    width: 65,
    height: 65,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cabinGradient: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#1e3a8a',
    borderRadius: 4,
    position: 'relative',
  },
  window: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: 28,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a8a',
  },
  windowGlass: {
    flex: 1,
  },
  driver: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 24,
  },
  wheelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  wheel: {
    position: 'absolute',
    width: 32,
    height: 32,
    bottom: -6,
  },
  backWheel: {
    left: 35,
  },
  frontWheel: {
    right: 18,
  },
  wheelOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#1f2937',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  wheelInner: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelHub: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6b7280',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  spoke: {
    position: 'absolute',
    width: 2,
    height: '80%',
    backgroundColor: '#6b7280',
  },
  smoke: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    flexDirection: 'row',
  },
  smokeText: {
    fontSize: 18,
  },
  messageContainer: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    fontSize: 10,
    color: '#3b82f6',
  },
});
