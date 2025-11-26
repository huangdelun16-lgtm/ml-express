import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { language } = useApp();
  const [countdown, setCountdown] = useState(5);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const t = {
    zh: {
      skip: '跳过',
      welcomeTitle: '欢迎使用',
      welcomeSubtitle: 'MARKET LINK EXPRESS',
      description: '快速、安全、可靠的同城配送服务',
      start: '立即体验',
    },
    en: {
      skip: 'Skip',
      welcomeTitle: 'Welcome to',
      welcomeSubtitle: 'MARKET LINK EXPRESS',
      description: 'Fast, Safe, and Reliable Same-City Delivery',
      start: 'Get Started',
    },
    my: {
      skip: 'ကျော်သွားမည်',
      welcomeTitle: 'ကြိုဆိုပါတယ်',
      welcomeSubtitle: 'MARKET LINK EXPRESS',
      description: 'မြန်ဆန်၊ ဘေးကင်းပြီး ယုံကြည်ရသော ပို့ဆောင်ရေး',
      start: 'စတင်လိုက်ပါ',
    },
  };

  const currentT = t[language] || t.zh;

  const navigateToNextScreen = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Navigation check failed:', error);
      navigation.replace('Login');
    }
  };

  useEffect(() => {
    // 动画效果
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 倒计时逻辑
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigateToNextScreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* 跳过按钮 */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={navigateToNextScreen}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>
            {currentT.skip} {countdown}s
          </Text>
        </TouchableOpacity>

        {/* 内容区域 */}
        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo-large.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>{currentT.welcomeTitle}</Text>
            <Text style={styles.brandName}>{currentT.welcomeSubtitle}</Text>
            <View style={styles.separator} />
            <Text style={styles.description}>{currentT.description}</Text>
          </Animated.View>
        </View>

        {/* 底部按钮 */}
        <Animated.View
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.startButtonText}>{currentT.start}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    letterSpacing: 1,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  separator: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    marginVertical: 24,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  startButton: {
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
