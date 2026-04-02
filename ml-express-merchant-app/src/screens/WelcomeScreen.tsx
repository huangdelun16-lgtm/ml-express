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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { welcomeScreenService, WelcomeScreen as WelcomeScreenData } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  const { language } = useApp();
  const [countdown, setCountdown] = useState(5);
  const [dynamicScreen, setDynamicScreen] = useState<WelcomeScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const loadDynamicContent = async () => {
      try {
        const screen = await welcomeScreenService.getActiveWelcomeScreen();
        if (screen) {
          setDynamicScreen(screen);
          setCountdown(screen.countdown || 5);
        }
      } catch (error) {
        console.warn('Failed to load dynamic welcome screen');
      } finally {
        setLoading(false);
      }
    };
    loadDynamicContent();
  }, []);

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
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 呼吸灯效果
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

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

  // 渲染背景装饰点
  const renderDecorations = () => {
    return Array(15).fill(0).map((_, i) => (
      <View
        key={i}
        style={[
          styles.decorationDot,
          {
            top: Math.random() * height,
            left: Math.random() * width,
            opacity: Math.random() * 0.3,
            width: Math.random() * 4,
            height: Math.random() * 4,
          }
        ]}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={dynamicScreen ? [dynamicScreen.bg_color_start!, dynamicScreen.bg_color_end!] : ['#0f172a', '#1e293b', '#0f172a']}
        style={styles.gradient}
      >
        {renderDecorations()}
        
        {/* 背景环绕光效 */}
        <View style={styles.bgGlow} />

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
              styles.logoWrapper,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            {/* 徽标背景光晕 */}
            <Animated.View style={[styles.logoGlow, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.logoCircle}>
              {dynamicScreen?.image_url ? (
                <Image
                  source={{ uri: dynamicScreen.image_url }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../../assets/logo-large.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              )}
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.welcomeTitle}>
              {dynamicScreen ? 
                (language === 'zh' ? dynamicScreen.title_zh : (language === 'en' ? (dynamicScreen.title_en || dynamicScreen.title_zh) : (dynamicScreen.title_my || dynamicScreen.title_zh))) 
                : currentT.welcomeTitle}
            </Text>
            
            <View style={styles.brandContainer}>
              <Text style={styles.brandName}>MARKET LINK</Text>
              <Text style={styles.brandExpress}>EXPRESS</Text>
            </View>

            <View style={styles.dividerContainer}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.dividerLine}
              />
            </View>

            <Text style={styles.description}>
              {dynamicScreen ? 
                (language === 'zh' ? dynamicScreen.description_zh : (language === 'en' ? (dynamicScreen.description_en || dynamicScreen.description_zh) : (dynamicScreen.description_my || dynamicScreen.description_zh))) 
                : currentT.description}
            </Text>
          </Animated.View>
        </View>

        {/* 底部按钮 */}
        <Animated.View
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={dynamicScreen ? [dynamicScreen.button_color_start!, dynamicScreen.button_color_end!] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.startButtonText}>
                {dynamicScreen ? 
                  (language === 'zh' ? dynamicScreen.button_text_zh : (language === 'en' ? (dynamicScreen.button_text_en || dynamicScreen.button_text_zh) : (dynamicScreen.button_text_my || dynamicScreen.button_text_zh))) 
                  : currentT.start}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* 底部点缀图标 */}
      <View style={styles.bottomStar}>
        <Ionicons name="sparkles" size={24} color="rgba(255,255,255,0.2)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  bgGlow: {
    position: 'absolute',
    top: height * 0.2,
    alignSelf: 'center',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    zIndex: 0,
  },
  decorationDot: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
    zIndex: 0,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logo: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeTitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    letterSpacing: 4,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  brandExpress: {
    fontSize: 38,
    fontWeight: '900',
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: -5,
    letterSpacing: 2,
    textShadowColor: 'rgba(245, 158, 11, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  },
  dividerContainer: {
    width: '100%',
    height: 2,
    marginVertical: 30,
    alignItems: 'center',
  },
  dividerLine: {
    width: '80%',
    height: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 1,
  },
  bottomContainer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
    width: '100%',
  },
  startButton: {
    borderRadius: 40,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 2,
  },
  bottomStar: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
});
