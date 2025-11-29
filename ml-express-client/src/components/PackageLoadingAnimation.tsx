import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PackageLoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  showOverlay?: boolean;
  message?: string;
}

const PackageLoadingAnimation: React.FC<PackageLoadingAnimationProps> = ({ 
  size = 'medium', 
  showOverlay = false,
  message = '加载中...'
}) => {
  const [isPaused, setIsPaused] = useState(false);
  
  // 动画值
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const lidAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // 尺寸配置
  const sizeConfig = {
    small: { box: 60, scale: 0.6 },
    medium: { box: 100, scale: 1 },
    large: { box: 140, scale: 1.4 },
  };

  const config = sizeConfig[size];

  useEffect(() => {
    if (!isPaused) {
      startAnimations();
    }
    return () => {
      stopAnimations();
    };
  }, [isPaused]);

  const startAnimations = () => {
    // 盒子跳动动画
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 盒盖开合动画
    Animated.loop(
      Animated.sequence([
        Animated.timing(lidAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(lidAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 光芒脉动动画
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 粒子漂浮动画
    particleAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 进度点动画
    dotAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const stopAnimations = () => {
    bounceAnim.stopAnimation();
    lidAnim.stopAnimation();
    glowAnim.stopAnimation();
    particleAnims.forEach(anim => anim.stopAnimation());
    dotAnims.forEach(anim => anim.stopAnimation());
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    bounceAnim.setValue(0);
    lidAnim.setValue(0);
    glowAnim.setValue(0);
    particleAnims.forEach(anim => anim.setValue(0));
    dotAnims.forEach(anim => anim.setValue(0));
    if (!isPaused) {
      startAnimations();
    }
  };

  // 动画插值
  const bounceTranslateY = bounceAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -30, -15, -25, 0],
  });

  const bounceRotateX = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '5deg', '0deg'],
  });

  const lidRotateX = lidAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '-60deg', '-30deg', '-45deg', '0deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  // 粒子位置
  const particlePositions = [
    { left: -20, bottom: 20 },
    { left: 20, bottom: 30 },
    { right: -20, bottom: 25 },
    { right: 20, bottom: 35 },
    { left: 0, bottom: 40 },
  ];

  const containerStyle = showOverlay ? styles.overlayContainer : styles.inlineContainer;

  return (
    <View style={[containerStyle, { transform: [{ scale: config.scale }] }]}>
      {showOverlay && <View style={styles.overlay} />}
      
      <View style={styles.content}>
        {/* 品牌标题 */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Text style={styles.brandTitle}>MARKET LINK EXPRESS</Text>
            <Text style={[styles.brandTitle, { fontStyle: 'italic', marginLeft: 8 }]}>Delivery Service</Text>
          </View>
          <Text style={styles.brandSubtitle}>专业快递服务</Text>
        </View>

        {/* 3D快递盒动画容器 */}
        <View style={styles.animationContainer}>
          {/* 粒子效果 */}
          {particleAnims.map((anim, index) => {
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -80],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1, 0],
            });
            const scale = anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1, 0.5],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  particlePositions[index],
                  {
                    opacity,
                    transform: [
                      { translateY },
                      { scale },
                    ],
                  },
                ]}
              />
            );
          })}

          {/* 快递盒主体 */}
          <Animated.View
            style={[
              styles.packageContainer,
              {
                transform: [
                  { translateY: bounceTranslateY },
                  { rotateX: bounceRotateX },
                ],
              },
            ]}
          >
            {/* 光芒效果 */}
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(46, 134, 171, 0.4)', 'rgba(76, 161, 207, 0.2)', 'transparent']}
                style={styles.glowGradient}
              />
            </Animated.View>

            {/* 盒盖 */}
            <Animated.View
              style={[
                styles.packageLid,
                {
                  transform: [{ rotateX: lidRotateX }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1c6a8f', '#2E86AB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.lidGradient}
              >
                {/* 橙色标签 */}
                <View style={styles.expressLabel}>
                  <Text style={styles.expressLabelText}>快递</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* 盒身 */}
            <View style={styles.packageBody}>
              <LinearGradient
                colors={['#2E86AB', '#4CA1CF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.bodyGradient}
              >
                {/* 品牌标识 */}
                <View style={styles.brandLogo}>
                  <Text style={styles.brandLogoText}>MARKET</Text>
                  <Text style={styles.brandLogoText}>LINK</Text>
                </View>

                {/* 胶带线 */}
                <View style={styles.tape} />
              </LinearGradient>
            </View>

            {/* 阴影 */}
            <Animated.View
              style={[
                styles.shadow,
                {
                  transform: [
                    {
                      scaleX: bounceAnim.interpolate({
                        inputRange: [0, 0.25, 1],
                        outputRange: [1, 1.3, 1],
                      }),
                    },
                  ],
                  opacity: bounceAnim.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0.3, 0.15, 0.3],
                  }),
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* 加载文字 */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
          
          {/* 进度点 */}
          <View style={styles.dotsContainer}>
            {dotAnims.map((anim, index) => {
              const scale = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.5],
              });
              const opacity = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      opacity,
                      transform: [{ scale }],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* 控制按钮 */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePauseToggle}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#2E86AB', '#1c6a8f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{isPaused ? '▶️' : '⏸️'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#F18F01', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>🔄</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

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
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    alignItems: 'center',
    zIndex: 10000,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CA1CF',
  },
  packageContainer: {
    width: 100,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  packageLid: {
    width: 100,
    height: 20,
    position: 'absolute',
    top: 0,
    transformOrigin: 'bottom',
    zIndex: 2,
  },
  lidGradient: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  expressLabel: {
    backgroundColor: '#F18F01',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  packageBody: {
    width: 100,
    height: 100,
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 1,
  },
  bodyGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  brandLogo: {
    alignItems: 'center',
    zIndex: 2,
  },
  brandLogoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tape: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(241, 143, 1, 0.6)',
    top: '50%',
    marginTop: -1.5,
  },
  shadow: {
    position: 'absolute',
    bottom: -15,
    width: 80,
    height: 10,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CA1CF',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  controlButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
  },
});

export default PackageLoadingAnimation;

