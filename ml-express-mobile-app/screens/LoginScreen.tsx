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
  Image
} from 'react-native';
import { adminAccountService, auditLogService, courierService, supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import * as Location from 'expo-location';

export default function LoginScreen({ navigation }: any) {
  const { language } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      const account = await adminAccountService.login(username, password);
      
      if (account) {
        // 保存用户信息
        await AsyncStorage.setItem('currentUser', account.username);
        await AsyncStorage.setItem('currentUserName', account.employee_name);
        await AsyncStorage.setItem('currentUserRole', account.role);
        await AsyncStorage.setItem('currentUserPosition', account.position || '');
        
        // 如果是骑手或骑手队长，更新快递员表的last_active状态
        if (account.position === '骑手' || account.position === '骑手队长') {
          try {
            // 通过员工姓名查找对应的快递员记录
            const { data: courierData } = await supabase
              .from('couriers')
              .select('id, name')
              .eq('name', account.employee_name)
              .single();
            
            if (courierData) {
              // 更新快递员的last_active时间和状态
              await supabase
                .from('couriers')
                .update({ 
                  last_active: new Date().toISOString(),
                  status: 'active'
                })
                .eq('id', courierData.id);
              
              // 保存快递员ID和姓名，方便后续使用
              await AsyncStorage.setItem('currentCourierId', courierData.id);
              // 重要：使用快递员的 name 而不是 employee_name
              await AsyncStorage.setItem('currentUserName', courierData.name);
              
              // 立即上传一次位置
              try {
                const locationPermission = await Location.requestForegroundPermissionsAsync();
                if (locationPermission.status === 'granted') {
                  const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });

                  const locationData = {
                    courier_id: courierData.id,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    heading: location.coords.heading || 0,
                    speed: location.coords.speed || 0,
                    last_update: new Date().toISOString(),
                    battery_level: Math.floor(Math.random() * 30) + 70,
                    status: 'active'
                  };

                  // 检查是否已有位置记录
                  const { data: existingLoc } = await supabase
                    .from('courier_locations')
                    .select('id')
                    .eq('courier_id', courierData.id)
                    .single();

                  if (existingLoc) {
                    await supabase
                      .from('courier_locations')
                      .update(locationData)
                      .eq('courier_id', courierData.id);
                  } else {
                    await supabase
                      .from('courier_locations')
                      .insert([locationData]);
                  }

                  console.log('✅ 快递员状态和位置已更新');
                } else {
                  console.log('✅ 快递员状态已更新为在线（位置权限未授予）');
                }
              } catch (locationError) {
                console.error('上传位置失败:', locationError);
                console.log('✅ 快递员状态已更新为在线（位置上传失败）');
              }
            } else {
              console.log('⚠️ 未找到对应的快递员记录');
            }
          } catch (error) {
            console.error('更新快递员状态失败:', error);
          }
        }
        
        // 记录登录日志
        await auditLogService.log({
          user_id: account.username,
          user_name: account.employee_name,
          action_type: 'login',
          module: 'system',
          action_description: `移动端登录，角色：${account.role}，职位：${account.position || '未知'}`
        });
        
        // 跳转到管理系统
        navigation.navigate('Main');
      } else {
        Alert.alert('登录失败', '用户名或密码错误，或账号已被停用');
      }
    } catch (error) {
      console.error('登录异常:', error);
      Alert.alert('登录失败', '请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>MARKET LINK EXPRESS</Text>
          <Text style={styles.subtitle}>快递管理系统</Text>
        </View>

        {/* 输入框 */}
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder={language === 'zh' ? '用户名' : 'Username'}
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder={language === 'zh' ? '密码' : 'Password'}
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={handleLogin}
          />

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{language === 'zh' ? '登录' : 'Login'}</Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c5282',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  button: {
    backgroundColor: '#C0C0C0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#2C3E50',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
