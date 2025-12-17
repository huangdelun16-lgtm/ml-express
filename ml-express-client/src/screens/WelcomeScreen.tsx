import React, { useEffect, useState, useRef } from 'react';
import LoggerService from '../services/LoggerService';
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
      description: 'Fast, Safe, and Reliable Same-City Delivery',
      start: 'Get Started',
    },
    my: {
      skip: 'ကျော်သွားမည်',
      welcomeTitle: 'ကြိုဆိုပါတယ်',
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
      LoggerService.error('Navigation check failed:', error);
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
          <View style={styles.textContainer}>
            <Text style={styles.welcomeTitle}>{currentT.welcomeTitle}</Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.brandName, { letterSpacing: 1 }]}>MARKET LINK</Text>
              <Text style={[styles.brandName, { 
                fontStyle: 'italic', 
                fontSize: 36, 
                color: '#f59e0b', // 金色
                marginTop: -8,
                letterSpacing: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }]}>EXPRESS</Text>
              
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>DELIVERY SERVICES</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <Text style={styles.description}>{currentT.description}</Text>
            </View>
          </View>
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
              colors={['#ffffff', '#f0f9ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={[styles.startButtonText, { color: '#0284c7' }]}>{currentT.start}</Text>
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
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    marginTop: -40, // 稍微上移一点，视觉更平衡
  },
  logoContainer: {
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ffffff',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '90%',
    height: '90%',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeTitle: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 12,
    letterSpacing: 2,
    fontWeight: '500',
  },
  brandName: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    flex: 1,
    maxWidth: 60,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    color: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 15,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomContainer: {
    paddingBottom: 50,
    paddingHorizontal: 32,
    width: '100%',
  },
  startButton: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});