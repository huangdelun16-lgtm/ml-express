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
import { adminAccountService, supabase } from '../services/supabase';
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
      Alert.alert(
        language === 'zh' ? '提示' : 'Tip', 
        language === 'zh' ? '请输入账号和密码' : 'Please enter account and password'
      );
      return;
    }

    setLoading(true);

    try {
      // ===== 员工登录 =====
      const account = await adminAccountService.login(username, password);
      
      if (account) {
        await AsyncStorage.setItem('currentUser', account.username);
        await AsyncStorage.setItem('currentUserName', account.employee_name);
        await AsyncStorage.setItem('currentUserRole', account.role);
        await AsyncStorage.setItem('currentUserPosition', account.position || '');
        
        if (account.position === '骑手' || account.position === '骑手队长') {
          try {
            const { data: courierData } = await supabase
              .from('couriers')
              .select('id, name')
              .eq('name', account.employee_name)
              .single();
            
            if (courierData) {
              await supabase
                .from('couriers')
                .update({ last_active: new Date().toISOString(), status: 'active' })
                .eq('id', courierData.id);
              
              await AsyncStorage.setItem('currentCourierId', courierData.id);
              await AsyncStorage.setItem('currentUserName', courierData.name);
              
              // 简单的位置上传逻辑...
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;
                    
                    await supabase
                        .from('couriers')
                        .update({
                            latitude,
                            longitude,
                            last_update: new Date().toISOString()
                        })
                        .eq('id', courierData.id);
                }
              } catch (e) {
                console.log('Location update error', e);
              }
            }
          } catch (error) {
            console.error('Courier data sync error:', error);
          }
        }
        
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
          <Text style={styles.subtitle}>
            Staff
          </Text>
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
    marginBottom: 30,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
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
    backgroundColor: '#C0C0C0', // Changed to match previous style or user preference
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
