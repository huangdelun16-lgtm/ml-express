import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  StatusBar
} from 'react-native';
import { adminAccountService, supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { locationService } from '../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { language } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(
        language === 'zh' ? '提示' : 'Tip', 
        language === 'zh' ? '请输入账号和密码' : 'Please enter account and password'
      );
      return;
    }

    setLoading(true);

    try {
      // ===== 员工登录 =====
      console.log('🚀 开始执行登录请求:', username);
      const account = await adminAccountService.login(username, password);
      
      if (account) {
        console.log('✅ 登录验证通过, 开始存储用户信息:', account.username);
        const userId = account.id || '';
        const userUsername = account.username || '';
        const userEmployeeName = account.employee_name || '';
        const userRole = account.role || 'operator';
        const userPosition = account.position || '';

        // 批量保存，增加错误检查
        try {
          // 🚀 核心逻辑：生成唯一的会话 ID
          const newSessionId = `SESS_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          // 🚀 修正：更新 admin_accounts 表（或 couriers 表，取决于您的账号体系）
          // 这里我们同时更新 admin_accounts 表
          await supabase
            .from('admin_accounts')
            .update({ current_session_id: newSessionId })
            .eq('id', userId);

          // 如果是骑手，也要同步更新 couriers 表中的会话
          if (userPosition === '骑手' || userPosition === '骑手队长') {
            await supabase
              .from('couriers')
              .update({ current_session_id: newSessionId })
              .eq('employee_id', account.employee_id || ''); // 通过员工编号关联
          }

          await Promise.all([
            AsyncStorage.setItem('currentUserId', userId),
            AsyncStorage.setItem('currentUser', userUsername),
            AsyncStorage.setItem('currentUserName', userEmployeeName),
            AsyncStorage.setItem('currentUserRole', userRole),
            AsyncStorage.setItem('currentUserPosition', userPosition),
            AsyncStorage.setItem('currentSessionId', newSessionId) // 本地也存一份
          ]);
        } catch (storageError) {
          console.error('❌ AsyncStorage 保存失败:', storageError);
        }
        
        // 🚀 核心：安全地尝试清除 Supabase Auth 状态
        try {
          if (supabase.auth) {
            await supabase.auth.signOut().catch(e => console.warn('Supabase signOut ignored:', e));
          }
        } catch (authError) {
          console.warn('Supabase auth check failed:', authError);
        }
        
        let courierId = '';
        
        if (userPosition === '骑手' || userPosition === '骑手队长') {
          console.log('🛵 检测到骑手身份，同步骑手数据...');
          try {
            // 1. 尝试查找现有骑手记录
            let { data: courierData, error: fetchError } = await supabase
              .from('couriers')
              .select('*')
              .eq('name', userEmployeeName)
              .maybeSingle();
            
            // 2. 如果不存在，则创建一个新的骑手记录
            if (!courierData && !fetchError) {
              console.log('📝 正在为新账号创建骑手记录...');
              const { data: newData, error: insertError } = await supabase
                .from('couriers')
                .insert([{
                  id: `COU${Date.now()}`,
                  name: userEmployeeName,
                  phone: account.phone || '',
                  employee_id: account.employee_id || '',
                  status: 'active',
                  vehicle_type: userPosition === '骑手队长' ? 'car' : 'motorcycle',
                  last_active: new Date().toISOString(),
                  credit_score: 100 // 🚀 初始信用分
                }])
                .select()
                .single();
              
              if (!insertError) {
                courierData = newData;
                console.log('✅ 骑手记录创建成功');
              } else {
                console.error('❌ 创建骑手记录失败:', insertError);
              }
            }
            
            // 3. 更新活跃状态和保存 ID
            if (courierData) {
              courierId = courierData.id;
              await supabase
                .from('couriers')
                .update({ 
                  last_active: new Date().toISOString(), 
                  status: 'active',
                  employee_id: account.employee_id || '', // 确保员工编号同步
                })
                .eq('id', courierId);
              
              await AsyncStorage.setItem('currentCourierId', courierId);
              await AsyncStorage.setItem('currentUserName', courierData.name);
              
              // 启动后台位置追踪 (增加错误捕获，防止权限拒绝导致崩溃)
              try {
                await locationService.startBackgroundTracking();
              } catch (locError) {
                console.warn('📍 启动位置追踪被跳过:', locError);
              }
            }
          } catch (error) {
            console.error('Courier data sync error:', error);
          }
        }

        // 🚀 核心改进：强制刷新并绑定推送令牌
        // 放在最后，确保 userId 和 courierId 都已经确定
        try {
          const token = await notificationService.registerForPushNotificationsAsync();
          if (token) {
            console.log('🔄 正在强制重新绑定推送令牌...');
            await notificationService.savePushTokenToSupabase(token, userId, courierId);
          }
        } catch (nsError) {
          console.warn('推送注册失败，但不影响登录:', nsError);
        }
        
        console.log('🏁 登录流程全部完成，跳转主页');
        navigation.replace('Main');
      } else {
        Alert.alert(
          language === 'zh' ? '登录失败' : 'Login Failed',
          language === 'zh' ? '用户名或密码错误' : 'Invalid username or password'
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        language === 'zh' ? '登录错误' : 'Login Error',
        error.message || 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 装饰圆形 */}
      <View style={[styles.circle, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
      <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: 'rgba(30, 58, 138, 0.2)' }]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoInnerRing}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>MARKET LINK EXPRESS</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COURIER PORTAL</Text>
            </View>
          </View>

          {/* 表单卡片 */}
          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={language === 'zh' ? '用户名' : 'Username'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={language === 'zh' ? '密码' : 'Password'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="rgba(255,255,255,0.6)" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{language === 'zh' ? '立即登录' : 'Login Now'}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" style={{marginLeft: 8}} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.registerLink}
              onPress={() => {
                Alert.alert(
                  language === 'zh' ? '申请入驻' : 'Apply to Join',
                  language === 'zh' 
                    ? '想要成为 ML Express 的骑手吗？请联系我们的地推人员或拨打客服热线进行申请。' 
                    : 'Want to become an ML Express rider? Please contact our local staff or call customer service to apply.'
                );
              }}
            >
              <Text style={styles.registerLinkText}>
                {language === 'zh' ? '没有账号？申请加入骑手' : 'No account? Apply to join'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025 Market Link Express
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  logoInnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordToggle: {
    paddingHorizontal: 16,
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  registerLinkText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
