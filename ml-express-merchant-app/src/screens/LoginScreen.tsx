import React, { useState } from 'react';
import LoggerService from './../services/LoggerService';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';
import { feedbackService } from '../services/FeedbackService';

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
      password: '密码',
      loginButton: '登录商户后台',
      storeCodePlaceholder: '请输入您的店铺代码',
      passwordPlaceholder: '请输入登录密码',
      loginSuccess: '商户登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写完整信息',
      loggingIn: '正在验证身份...',
      language: '语言',
      storeNotFound: '店铺代码不存在',
      storePasswordError: '密码错误',
      queryStoreFailed: '查询店铺失败，请稍后重试',
      welcomeMERCHANTS: '欢迎回来，',
    },
    en: {
      welcome: 'Merchant Admin',
      title: 'Merchant Login',
      subtitle: 'Manage your store, orders and products',
      storeCode: 'Store Code',
      password: 'Password',
      loginButton: 'Login to Backoffice',
      storeCodePlaceholder: 'Enter your store code',
      passwordPlaceholder: 'Enter your password',
      loginSuccess: 'Merchant login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
      loggingIn: 'Verifying identity...',
      language: 'Language',
      storeNotFound: 'Store code not found',
      storePasswordError: 'Incorrect password',
      queryStoreFailed: 'Failed to query store',
      welcomeMERCHANTS: 'Welcome back, ',
    },
    my: {
      welcome: 'ကုန်သည် စီမံခန့်ခွဲမှု',
      title: 'ကုန်သည်ဝင်ရောက်ရန်',
      subtitle: 'သင့်ဆိုင်၊ အော်ဒါများနှင့် ကုန်ပစ္စည်းများကို စီမံခန့်ခွဲပါ',
      storeCode: 'ဆိုင်ကုဒ်',
      password: 'စကားဝှက်',
      loginButton: 'စီမံခန့်ခွဲမှုစနစ်သို့ ဝင်ရောက်ပါ',
      storeCodePlaceholder: 'ဆိုင်ကုဒ်ထည့်ပါ',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginSuccess: 'ကုန်သည်ဝင်ရောက်မှု အောင်မြင်သည်',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်များဖြည့်ပါ',
      loggingIn: 'အထောက်အထားစစ်ဆေးနေသည်...',
      language: 'ဘာသာစကား',
      storeNotFound: 'ဆိုင်ကုဒ် မရှိပါ',
      storePasswordError: 'စကားဝှက်မှားနေပါသည်',
      queryStoreFailed: 'ဆိုင်ကို ရှာဖွေရန် မအောင်မြင်ပါ',
      welcomeMERCHANTS: 'ပြန်လည်ကြိုဆိုပါတယ် ',
    },
  };

  const currentT = t[language] || t.zh;

  const handleLogin = async () => {
    if (!email || !password) {
      feedbackService.warning(currentT.fillAllFields);
      return;
    }

    setLoading(true);
    showLoading(currentT.loggingIn);

    try {
      const storeCode = email.trim();
      const { data: store, error: storeError } = await supabase
        .from('delivery_stores')
        .select('*')
        .eq('store_code', storeCode)
        .maybeSingle();

      hideLoading();

      if (storeError) {
        LoggerService.error('查询合伙店铺失败:', storeError);
        feedbackService.error(currentT.queryStoreFailed);
        return;
      }

      if (!store) {
        feedbackService.error(currentT.storeNotFound);
        return;
      }

      if (store.password !== password) {
        feedbackService.error(currentT.storePasswordError);
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
      
      await supabase
        .from('delivery_stores')
        .update({ current_session_id: newSessionId })
        .eq('id', store.id);

      await AsyncStorage.setItem('currentUser', JSON.stringify(merchantsUser));
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
        colors={['#0f172a', '#1e293b', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LanguageSelector />

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.appTitleContainer}>
              <Text style={styles.appTitleMain}>MARKET LINK </Text>
              <Text style={styles.appTitleExpress}>EXPRESS</Text>
            </View>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>MERCHANTS</Text>
              <View style={styles.line} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.storeCode}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.storeCodePlaceholder}
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={currentT.passwordPlaceholder}
                  placeholderTextColor="#94a3b8"
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appTitleMain: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  appTitleExpress: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerInfo: {
    marginTop: 40,
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    fontWeight: '600',
  }
});
