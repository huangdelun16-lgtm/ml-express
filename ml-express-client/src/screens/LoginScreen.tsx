import React, { useState } from 'react';
import LoggerService from './../services/LoggerService';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { customerService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import LanguageSelector from '../components/LanguageSelector';
import { feedbackService } from '../services/FeedbackService';

export default function LoginScreen({ navigation }: any) {
  const { language } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const [loginType, setLoginType] = useState<'customer' | 'merchants'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const t = {
    zh: {
      welcome: '欢迎回来',
      title: '登录',
      subtitle: '登录您的账户继续使用服务',
      customerLogin: '会员',
      merchantsLogin: '商家',
      email: '邮箱/手机号',
      storeCode: '店铺代码',
      password: '密码',
      loginButton: '登录',
      noAccount: '还没有账号？',
      register: '立即注册',
      emailPlaceholder: '请输入注册时的邮箱或手机号',
      storeCodePlaceholder: '请输入店铺代码',
      passwordPlaceholder: '请输入密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
      fillAllFields: '请填写完整信息',
      loggingIn: '正在登录...',
      language: '语言',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
      storeNotFound: '店铺代码不存在',
      storePasswordError: '密码错误',
      queryStoreFailed: '查询店铺失败，请稍后重试',
      welcomeMERCHANTS: '欢迎回来，',
    },
    en: {
      welcome: 'Welcome Back',
      title: 'Login',
      subtitle: 'Sign in to your account to continue',
      customerLogin: 'Member',
      merchantsLogin: 'MERCHANTS',
      email: 'Email/Phone',
      storeCode: 'Store Code',
      password: 'Password',
      loginButton: 'Login',
      noAccount: "Don't have an account?",
      register: 'Register Now',
      emailPlaceholder: 'Enter registered email or phone',
      storeCodePlaceholder: 'Enter store code',
      passwordPlaceholder: 'Enter password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      fillAllFields: 'Please fill all fields',
      loggingIn: 'Logging in...',
      language: 'Language',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
      storeNotFound: 'Store code not found',
      storePasswordError: 'Incorrect password',
      queryStoreFailed: 'Failed to query store',
      welcomeMERCHANTS: 'Welcome back, ',
    },
    my: {
      welcome: 'ပြန်လည်ကြိုဆိုပါတယ်',
      title: 'ဝင်ရောက်ရန်',
      subtitle: 'သင့်အကောင့်သို့ဝင်ရောက်ပါ',
      customerLogin: 'အဖွဲ့ဝင်',
      merchantsLogin: 'ကုန်သည်',
      email: 'အီးမေးလ်/ဖုန်း',
      storeCode: 'ဆိုင်ကုဒ်',
      password: 'စကားဝှက်',
      loginButton: 'ဝင်ရောက်',
      noAccount: 'အကောင့်မရှိသေးဘူးလား?',
      register: 'စာရင်းသွင်း',
      emailPlaceholder: 'မှတ်ပုံတင်ထားသော အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်ထည့်ပါ',
      storeCodePlaceholder: 'ဆိုင်ကုဒ်ထည့်ပါ',
      passwordPlaceholder: 'စကားဝှက်ထည့်ပါ',
      loginSuccess: 'အောင်မြင်စွာဝင်ရောက်ပြီး',
      loginFailed: 'ဝင်ရောက်မှုမအောင်မြင်',
      fillAllFields: 'အချက်အလက်များဖြည့်ပါ',
      loggingIn: 'ဝင်ရောက်နေသည်...',
      language: 'ဘာသာစကား',
      languageChinese: '中文',
      languageEnglish: 'English',
      languageBurmese: 'မြန်မာ',
      storeNotFound: 'ဆိုင်ကုဒ် မရှိပါ',
      storePasswordError: 'စကားဝှက်မှားနေပါသည်',
      queryStoreFailed: 'ဆိုင်ကို ရှာဖွေရန် မအောင်မြင်ပါ',
      welcomeMERCHANTS: 'ပြန်လည်ကြိုဆိုပါတယ် ',
    },
  };

  const currentT = t[language];

  const handleLogin = async () => {
    if (!email || !password) {
      feedbackService.warning(currentT.fillAllFields);
      return;
    }

    setLoading(true);
    showLoading(currentT.loggingIn);

    try {
      if (loginType === 'customer') {
        // ===== 客户登录 =====
        const result = await customerService.login(email.trim(), password);
        
        hideLoading();

        if (result.success && result.data) {
          // 保存用户信息到本地（保存完整用户对象）
          await AsyncStorage.setItem('currentUser', JSON.stringify(result.data));
          await AsyncStorage.setItem('userId', result.data.id);
          await AsyncStorage.setItem('userEmail', result.data.email);
          await AsyncStorage.setItem('userName', result.data.name);
          await AsyncStorage.setItem('userPhone', result.data.phone);
          // 确保 user_type 正确
          await AsyncStorage.setItem('userType', 'customer');
          
          // 🚀 新增：注册并保存推送令牌
          try {
            const NotificationService = require('../services/notificationService').default;
            const ns = NotificationService.getInstance();
            const token = await ns.getExpoPushToken();
            if (token) {
              await ns.savePushTokenToSupabase(result.data.id, token);
            }
          } catch (nsError) {
            console.warn('推送注册失败，但不影响登录:', nsError);
          }
          
          feedbackService.success(currentT.loginSuccess);
          navigation.replace('Main');
        } else {
          const errorMessage = result.error?.message || currentT.loginFailed;
          feedbackService.error(errorMessage);
        }
      } else {
        // ===== 合伙登录 =====
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

        // 构造商家用户对象（兼容 User 接口）
        const merchantsUser = {
          id: store.id,
          name: store.store_name,
          email: store.email || store.store_code,
          phone: store.contact_phone || '',
          address: store.address || '',
          user_type: 'merchants', // 标记为商家
          status: 'active',
          registration_date: store.created_at,
          last_login: new Date().toISOString(),
          total_orders: 0,
          total_spent: 0,
          rating: 5,
          notes: '',
          store_code: store.store_code, // 额外字段
          store_id: store.id // 额外字段
        };

        // 保存商家信息
        await AsyncStorage.setItem('currentUser', JSON.stringify(merchantsUser));
        await AsyncStorage.setItem('userId', store.id);
        await AsyncStorage.setItem('userEmail', store.email || store.store_code);
        await AsyncStorage.setItem('userName', store.store_name);
        await AsyncStorage.setItem('userPhone', store.contact_phone || '');
        await AsyncStorage.setItem('userType', 'merchants');
        await AsyncStorage.setItem('currentStoreCode', store.store_code);

        // 🚀 新增：注册并保存推送令牌（商家使用 delivery_stores 表，但目前我们的推送通知统一查 users 表）
        // 如果商家也需要推送，建议将推送令牌也保存到 delivery_stores 表
        try {
          const NotificationService = require('../services/notificationService').default;
          const ns = NotificationService.getInstance();
          const token = await ns.getExpoPushToken();
          if (token) {
            // 目前先尝试更新 delivery_stores 表（假设也有该字段）
            await supabase
              .from('delivery_stores')
              .update({ push_token: token })
              .eq('id', store.id);
          }
        } catch (nsError) {
          console.warn('推送注册失败，但不影响登录:', nsError);
        }

        feedbackService.success(`${currentT.welcomeMERCHANTS}${store.store_name}`);
        navigation.replace('Main');
      }
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
        colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Selector */}
          <LanguageSelector />

          {/* Logo Area */}
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
              <Text style={styles.dividerText}>DELIVERY SERVICE</Text>
              <View style={styles.line} />
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Login Type Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, loginType === 'customer' && styles.activeTabButton]}
                onPress={() => {
                  setLoginType('customer');
                  setEmail('');
                  setPassword('');
                }}
              >
                <Text style={[styles.tabText, loginType === 'customer' && styles.activeTabText]}>
                  {currentT.customerLogin}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, loginType === 'merchants' && styles.activeTabButton]}
                onPress={() => {
                  setLoginType('merchants');
                  setEmail('');
                  setPassword('');
                }}
              >
                <Text style={[styles.tabText, loginType === 'merchants' && styles.activeTabText]}>
                  {currentT.merchantsLogin}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {loginType === 'customer' ? currentT.email : currentT.storeCode}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={loginType === 'customer' ? currentT.emailPlaceholder : currentT.storeCodePlaceholder}
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType={loginType === 'customer' ? 'email-address' : 'default'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{currentT.password}</Text>
              <TextInput
                style={styles.input}
                placeholder={currentT.passwordPlaceholder}
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
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

            {loginType === 'customer' && (
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerText}>
                  {currentT.noAccount} <Text style={styles.registerHighlight}>{currentT.register}</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingHorizontal: 20,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTitleExpress: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dividerText: {
    color: '#fff',
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 25,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#2B6CB0',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3748',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#718096',
    fontSize: 14,
  },
  registerHighlight: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});