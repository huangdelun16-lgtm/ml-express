import React, { useState } from 'react';
import LoggerService from './../services/LoggerService';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import { merchantAuthService, MerchantAuthError } from '../services/merchantAuthService';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';
import { feedbackService } from '../services/FeedbackService';
import {
  getMerchantLoginBlockReason,
  type MerchantLoginLang,
} from '../services/_shared/merchantLoginGuard';

export default function LoginScreen({ navigation }: any) {
  const { language, refreshSession } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      welcome: '商户端管理',
      title: '商家登录',
      subtitle: '管理您的店铺、订单与商品',
      storeCode: '店铺代码',
      storeCodePlaceholder: '例如 MDY001',
      password: '密码',
      passwordPlaceholder: '请输入密码',
      loginButton: '登录商户后台',
      loginSuccess: '商户登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写完整信息',
      loggingIn: '正在验证身份...',
      language: '语言',
      storeNotFound: '店铺代码不存在',
      storePasswordError: '密码错误',
      queryStoreFailed: '查询店铺失败，请稍后重试',
      networkError: '无法连接登录服务器，请检查移动网络或 Wi-Fi 后重试。',
      welcomeMERCHANTS: '欢迎回来，',
    },
    en: {
      welcome: 'Merchant Admin',
      title: 'Merchant Login',
      subtitle: 'Manage your store, orders and products',
      storeCode: 'Store Code',
      storeCodePlaceholder: 'e.g. MDY001',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      loginButton: 'Login to Backoffice',
      loginSuccess: 'Merchant login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
      loggingIn: 'Verifying identity...',
      language: 'Language',
      storeNotFound: 'Store code not found',
      storePasswordError: 'Incorrect password',
      queryStoreFailed: 'Failed to query store',
      networkError: 'Cannot reach login server. Check your network and try again.',
      welcomeMERCHANTS: 'Welcome back, ',
    },
    my: {
      welcome: 'ကုန်သည် စီမံခန့်ခွဲမှု',
      title: 'ကုန်သည်ဝင်ရောက်ရန်',
      subtitle: 'သင့်ဆိုင်၊ အော်ဒါများနှင့် ကုန်ပစ္စည်းများကို စီမံခန့်ခွဲပါ',
      storeCode: 'ဆိုင်ကုဒ်',
      storeCodePlaceholder: 'ဥပမာ MDY001',
      password: 'စကားဝှက်',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginButton: 'စီမံခန့်ခွဲမှုစနစ်သို့ ဝင်ရောက်ပါ',
      loginSuccess: 'ကုန်သည်ဝင်ရောက်မှု အောင်မြင်သည်',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်များဖြည့်ပါ',
      loggingIn: 'အထောက်အထားစစ်ဆေးနေသည်...',
      language: 'ဘာသာစကား',
      storeNotFound: 'ဆိုင်ကုဒ် မရှိပါ',
      storePasswordError: 'စကားဝှက်မှားနေပါသည်',
      queryStoreFailed: 'ဆိုင်ကို ရှာဖွေရန် မအောင်မြင်ပါ',
      networkError: 'လော့ဂ်အင်ဆာဗာသို့ ချိတ်ဆက်မရပါ။ ကွန်ရက်ကို စစ်ဆေးပါ။',
      welcomeMERCHANTS: 'ပြန်လည်ကြိုဆိုပါတယ် ',
    },
  };

  const insets = useSafeAreaInsets();
  const currentT = t[language] || t.zh;
  const loginLang: MerchantLoginLang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';

  const handleLogin = async () => {
    if (!email || !password) {
      feedbackService.warning(currentT.fillAllFields);
      return;
    }

    setLoading(true);
    showLoading(currentT.loggingIn);

    try {
      // 🚀 核心优化：增加网络状态预检
      const NetInfo = require("@react-native-community/netinfo").default;
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        hideLoading();
        feedbackService.error(
          language === "zh"
            ? "网络连接不可用，请检查您的网络设置"
            : "Network connection unavailable, please check your settings.",
        );
        setLoading(false);
        return;
      }

      const storeCodeInput = email.trim().toUpperCase();
      let store;
      try {
        store = await merchantAuthService.login(storeCodeInput, password);
      } catch (authError: any) {
        hideLoading();
        const kind =
          authError instanceof MerchantAuthError
            ? authError.kind
            : /网络|超时|timeout|Abort|Failed to fetch|Network|无法连接/i.test(String(authError?.message || ''))
              ? 'network'
              : 'credentials';
        const raw = String(authError?.message || '');

        if (kind === 'network') {
          feedbackService.error(raw || currentT.networkError);
          return;
        }

        if (/店铺代码不存在|Store code not found/i.test(raw)) {
          const { data: userData } = await supabase
            .from("users")
            .select("id, user_type")
            .or(`email.eq.${storeCodeInput},phone.eq.${storeCodeInput}`)
            .maybeSingle();

          if (userData) {
            let errorMsg =
              language === "zh"
                ? "检测到非商家账号。请使用商家专属代码登录。"
                : "Non-merchant account detected. Please use your Merchant Store Code.";

            if (userData.user_type === "admin") {
              errorMsg =
                language === "zh"
                  ? "检测到管理员账号。本 App 仅供商家使用，请前往管理后台。"
                  : "Admin account detected. This app is for Merchants only.";
            }

            feedbackService.error(errorMsg);
          } else {
            feedbackService.error(currentT.storeNotFound);
          }
          return;
        }

        feedbackService.error(raw || currentT.storePasswordError);
        return;
      }

      hideLoading();

      const blockReason = getMerchantLoginBlockReason(store, loginLang);
      if (blockReason) {
        feedbackService.error(blockReason);
        return;
      }

      // 构造商家用户对象
      const merchantsUser = {
        id: store.id,
        name: store.store_name,
        email: store.email || store.store_code,
        phone: store.phone || '',
        address: store.address || '',
        user_type: 'merchant',
        status: 'active',
        registration_date: store.created_at,
        last_login: new Date().toISOString(),
        total_orders: 0,
        total_spent: 0,
        rating: 5,
        notes: '',
        store_code: store.store_code,
        store_id: store.id
      };

      const newSessionId = `SESS_MER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 🚀 核心优化：更新会话 ID 改为非阻塞式，防止由于 RLS 或网络波动导致登录失败
      try {
        await supabase
          .from("delivery_stores")
          .update({ current_session_id: newSessionId })
          .eq("id", store.id);
      } catch (sessErr) {
        console.warn("更新会话失败，但不影响本次登录:", sessErr);
      }

      await AsyncStorage.setItem("currentUser", JSON.stringify(merchantsUser));
      await AsyncStorage.setItem('userId', store.id);
      await AsyncStorage.setItem('userEmail', store.email || store.store_code);
      await AsyncStorage.setItem('userName', store.store_name);
      await AsyncStorage.setItem('userPhone', store.phone || '');
      await AsyncStorage.setItem('userType', 'merchant');
      await AsyncStorage.setItem('currentStoreCode', store.store_code);
      await AsyncStorage.setItem('currentSessionId', newSessionId);

      await refreshSession();

      try {
        const NotificationService = require('../services/notificationService').default;
        const ns = NotificationService.getInstance();
        const token = await ns.getExpoPushToken();
        if (token) {
          await supabase
            .from('delivery_stores')
            .update({ push_token: token })
            .eq('id', store.id);
        }
      } catch (nsError) {
        console.warn('推送注册失败:', nsError);
      }

      feedbackService.success(`${currentT.welcomeMERCHANTS}${store.store_name}`);
      navigation.replace('Main');
    } catch (error: any) {
      hideLoading();
      LoggerService.error('登录错误:', error);
      feedbackService.error(error.message || currentT.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#0f172a', '#162032', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 64, paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LanguageSelector />

          <View style={styles.logoContainer}>
            <View style={styles.logoPlate}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.role}>{currentT.welcome}</Text>
            <Text style={styles.brandName}>MARKET LINK</Text>
            <Text style={styles.brandExpress}>EXPRESS</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.storeCode}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.storeCodePlaceholder}
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="characters" // 🚀 自动转大写，匹配 MDY001 格式
                autoCorrect={false}
                spellCheck={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={currentT.passwordPlaceholder}
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{currentT.loginButton}</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footerInfo}>Market Link Express © 2026</Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  logoPlate: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 56,
    height: 56,
  },
  role: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  brandName: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandExpress: {
    marginTop: 2,
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  subtitle: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordIcon: {
    padding: 12,
  },
  loginButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  footerInfo: {
    marginTop: 28,
    color: 'rgba(148, 163, 184, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  }
});
