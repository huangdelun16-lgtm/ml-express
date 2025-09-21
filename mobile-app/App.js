import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, orderService, riderService, financeService, adminService } from './services/api';
import OrderList from './components/OrderList';
import QuickOrder from './components/QuickOrder';
import LocationService from './components/LocationService';
import FinanceManager from './components/FinanceManager';
import AdminConsole from './components/AdminConsole';
import TaskNotification from './components/TaskNotification';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subScreen, setSubScreen] = useState('home'); // 子页面状态
  const [riderOnline, setRiderOnline] = useState(false); // 骑手在线状态
  const [locationServiceEnabled, setLocationServiceEnabled] = useState(false);

  // 检查本地存储的登录状态
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('userToken');
      const savedUserData = await AsyncStorage.getItem('userData');
      
      if (savedToken && savedUserData) {
        const user = JSON.parse(savedUserData);
        setUserData(user);
        setUserRole(user.role);
        
        // 根据用户角色设置界面
        if (user.role === 'customer') {
          setCurrentScreen('customer');
        } else if (user.role === 'city_rider') {
          setCurrentScreen('rider');
        } else if (user.role === 'city_accountant' || user.role === 'accountant') {
          setCurrentScreen('finance');
        } else if (user.role === 'manager' || user.role === 'master') {
          setCurrentScreen('admin');
        } else {
          setCurrentScreen('customer');
        }
      } else {
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setCurrentScreen('login');
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }

    setIsLoading(true);
    
    try {
      // 调用真实的登录API
      const response = await authService.login(username.trim(), password);
      
      if (response.success) {
        // 保存登录信息到本地
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        
        setUserData(response.user);
        setUserRole(response.user.role);
        
        // 根据用户角色跳转到对应界面
        if (response.user.role === 'customer') {
          setCurrentScreen('customer');
        } else if (response.user.role === 'city_rider') {
          setCurrentScreen('rider');
        } else if (response.user.role === 'city_accountant' || response.user.role === 'accountant') {
          setCurrentScreen('finance');
        } else if (response.user.role === 'manager' || response.user.role === 'master') {
          setCurrentScreen('admin');
        } else {
          setCurrentScreen('customer');
        }
        
        Alert.alert('登录成功', `欢迎回来，${response.user.name || response.user.username}！`);
      } else {
        Alert.alert('登录失败', response.message || '用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      Alert.alert('登录失败', '网络连接失败，请检查网络后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 清除本地存储
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      setUserRole(null);
      setUserData(null);
      setCurrentScreen('login');
      setUsername('');
      setPassword('');
      
      Alert.alert('退出成功', '已安全退出登录');
    } catch (error) {
      console.error('退出失败:', error);
    }
  };

  // 加载界面
  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>🚚 ML Express</Text>
        <Text style={styles.loadingSubtext}>正在加载...</Text>
      </View>
    );
  }

  // 登录界面
  if (currentScreen === 'login') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        
        <View style={styles.header}>
          <Text style={styles.title}>🚚 ML Express</Text>
          <Text style={styles.subtitle}>同城运输专家</Text>
        </View>

        <View style={styles.loginForm}>
          <TextInput
            style={styles.input}
            placeholder="用户名 (使用网站相同的用户名)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="密码 (使用网站相同的密码)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
          
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              Alert.alert('连接测试', '正在测试与网站的连接...');
              try {
                const response = await fetch('https://market-link-express.com/.netlify/functions/mobile-auth', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'login',
                    username: 'test',
                    password: 'test'
                  })
                });
                const data = await response.json();
                Alert.alert(
                  '连接测试结果', 
                  response.ok 
                    ? '✅ 连接成功！可以正常登录' 
                    : `❌ 连接失败: ${data.message || '未知错误'}`
                );
              } catch (error) {
                Alert.alert('连接测试失败', '❌ 网络连接失败: ' + error.message);
              }
            }}
          >
            <Text style={styles.testButtonText}>🔧 测试连接</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            💡 使用您在网站上的账号登录，数据完全同步{'\n'}
            🧪 测试账号: customer, rider, finance, admin (任意密码)
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 ML Express</Text>
        </View>
      </View>
    );
  }

  // 客户界面
  if (currentScreen === 'customer') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>👤 客户中心</Text>
            <Text style={styles.userInfo}>
              {userData?.name || userData?.username} | {userData?.phone}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {subScreen === 'home' && (
          <ScrollView style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 快速下单</Text>
              <Text style={styles.cardDescription}>填写寄件和收件信息，快速创建订单</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('order')}
              >
                <Text style={styles.cardButtonText}>立即下单</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 订单历史</Text>
              <Text style={styles.cardDescription}>查看您的所有订单和配送状态</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('orders')}
              >
                <Text style={styles.cardButtonText}>查看订单</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 实时跟踪</Text>
              <Text style={styles.cardDescription}>实时查看包裹位置和配送进度</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('tracking')}
              >
                <Text style={styles.cardButtonText}>跟踪包裹</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌐 数据同步</Text>
              <Text style={styles.cardDescription}>
                ✅ 已连接到网站后端{'\n'}
                ✅ 账号数据完全同步{'\n'}
                ✅ 订单状态实时更新
              </Text>
            </View>
          </ScrollView>
        )}

        {subScreen === 'order' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>快速下单</Text>
            </View>
            <QuickOrder 
              userData={userData} 
              onOrderCreated={() => {
                Alert.alert('下单成功', '订单已创建，可在订单历史中查看', [
                  { text: '查看订单', onPress: () => setSubScreen('orders') },
                  { text: '继续下单', onPress: () => {} },
                ]);
              }}
            />
          </View>
        )}

        {subScreen === 'orders' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>我的订单</Text>
            </View>
            <OrderList userRole={userRole} userData={userData} />
          </View>
        )}

        {subScreen === 'tracking' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>实时跟踪</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.comingSoon}>🚧 实时跟踪功能开发中...</Text>
              <Text style={styles.comingSoonDesc}>
                此功能将显示包裹的实时位置和配送进度
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // 骑手界面
  if (currentScreen === 'rider') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🚴‍♂️ 骑手工作台</Text>
            <Text style={styles.userInfo}>
              {userData?.name || userData?.username} | {userData?.phone}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {subScreen === 'home' && (
          <ScrollView style={styles.content}>
            <View style={styles.statsCard}>
              <Text style={styles.cardTitle}>今日统计</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>-</Text>
                  <Text style={styles.statLabel}>接单数</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>-</Text>
                  <Text style={styles.statLabel}>完成数</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>¥0</Text>
                  <Text style={styles.statLabel}>收入</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📱 工作状态</Text>
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  riderOnline ? styles.onlineButton : styles.offlineButton
                ]}
                onPress={async () => {
                  try {
                    const newStatus = !riderOnline;
                    const response = await riderService.updateRiderStatus(
                      userData.id, 
                      newStatus ? 'online' : 'offline'
                    );
                    
                    if (response.success) {
                      setRiderOnline(newStatus);
                      Alert.alert(
                        '状态更新成功',
                        newStatus ? '您已上线，可以接收新订单' : '您已下线'
                      );
                    } else {
                      Alert.alert('状态更新失败', '请稍后重试');
                    }
                  } catch (error) {
                    Alert.alert('状态更新失败', '网络错误，请稍后重试');
                  }
                }}
              >
                <Text style={styles.statusButtonText}>
                  {riderOnline ? '🟢 在线中 - 点击下线' : '🔴 离线中 - 点击上线'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 订单管理</Text>
              <Text style={styles.cardDescription}>查看分配给您的订单，管理配送任务</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('orders')}
              >
                <Text style={styles.cardButtonText}>查看订单</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 位置服务</Text>
              <Text style={styles.cardDescription}>开启GPS定位，实时上传位置信息</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('location')}
              >
                <Text style={styles.cardButtonText}>位置设置</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌐 数据同步</Text>
              <Text style={styles.cardDescription}>
                ✅ 已连接到调度中心{'\n'}
                ✅ 订单状态实时同步{'\n'}
                ✅ 位置信息自动上传
              </Text>
            </View>
          </ScrollView>
        )}

        {subScreen === 'orders' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>我的订单</Text>
            </View>
            <OrderList userRole={userRole} userData={userData} />
          </View>
        )}

        {subScreen === 'location' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>位置服务</Text>
            </View>
            <LocationService 
              userData={userData} 
              isActive={riderOnline}
              onStatusChange={setLocationServiceEnabled}
            />
          </View>
        )}

        {/* 任务通知组件 - 只在骑手界面显示 */}
        <TaskNotification 
          userData={userData}
          onTaskUpdate={(taskUpdate) => {
            console.log('🔄 处理任务状态更新:', taskUpdate);
            
            if (taskUpdate.type === 'accept') {
              // 接单后更新骑手状态为忙碌
              setRiderOnline(false);
              Alert.alert('任务已接受', '您的状态已更新为忙碌，请及时处理订单');
            } else if (taskUpdate.type === 'reject') {
              // 拒单后保持在线状态
              console.log('❌ 任务已拒绝，保持在线状态');
            } else if (taskUpdate.type === 'complete') {
              // 完成任务后恢复在线状态
              setRiderOnline(true);
              Alert.alert('任务完成', '您的状态已恢复为在线，可以接收新订单');
            }
          }}
        />
      </View>
    );
  }

  // 财务界面
  if (currentScreen === 'finance') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        
        <View style={styles.header}>
          <Text style={styles.title}>💰 财务管理</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {subScreen === 'home' && (
          <ScrollView style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 财务概览</Text>
              <Text style={styles.cardDescription}>今日收入统计和财务报表</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('records')}
              >
                <Text style={styles.cardButtonText}>查看记录</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 财务记录</Text>
              <Text style={styles.cardDescription}>管理所有订单的财务状态</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('records')}
              >
                <Text style={styles.cardButtonText}>财务记录</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>💳 状态管理</Text>
              <Text style={styles.cardDescription}>更新订单付款和结算状态</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('records')}
              >
                <Text style={styles.cardButtonText}>状态管理</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌐 数据同步</Text>
              <Text style={styles.cardDescription}>
                ✅ 已连接到财务系统{'\n'}
                ✅ 订单状态实时同步{'\n'}
                ✅ 支付信息自动更新
              </Text>
            </View>
          </ScrollView>
        )}

        {subScreen === 'records' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>财务记录</Text>
            </View>
            <FinanceManager userData={userData} />
          </View>
        )}
      </View>
    );
  }

  // 管理员界面
  if (currentScreen === 'admin') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor="#1976d2" />
        
        <View style={styles.header}>
          <Text style={styles.title}>🛠️ 管理控制台</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {subScreen === 'home' && (
          <ScrollView style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👥 控制台</Text>
              <Text style={styles.cardDescription}>新增用户、管理账户、系统设置</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('console')}
              >
                <Text style={styles.cardButtonText}>控制台</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 订单管理</Text>
              <Text style={styles.cardDescription}>查看和管理所有订单</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('orders')}
              >
                <Text style={styles.cardButtonText}>订单管理</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>💰 财务管理</Text>
              <Text style={styles.cardDescription}>查看财务记录和状态管理</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('finance')}
              >
                <Text style={styles.cardButtonText}>财务管理</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🗺️ 实时跟踪</Text>
              <Text style={styles.cardDescription}>查看所有骑手的实时位置</Text>
              <TouchableOpacity 
                style={styles.cardButton}
                onPress={() => setSubScreen('tracking')}
              >
                <Text style={styles.cardButtonText}>实时跟踪</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌐 系统状态</Text>
              <Text style={styles.cardDescription}>
                ✅ 管理员权限已激活{'\n'}
                ✅ 所有模块数据同步{'\n'}
                ✅ 实时监控运行中
              </Text>
            </View>
          </ScrollView>
        )}

        {subScreen === 'console' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>控制台</Text>
            </View>
            <AdminConsole userData={userData} />
          </View>
        )}

        {subScreen === 'orders' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>订单管理</Text>
            </View>
            <OrderList userRole={userRole} userData={userData} />
          </View>
        )}

        {subScreen === 'finance' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>财务管理</Text>
            </View>
            <FinanceManager userData={userData} />
          </View>
        )}

        {subScreen === 'tracking' && (
          <View style={styles.fullScreen}>
            <View style={styles.subHeader}>
              <TouchableOpacity onPress={() => setSubScreen('home')}>
                <Text style={styles.backButton}>← 返回</Text>
              </TouchableOpacity>
              <Text style={styles.subTitle}>实时跟踪</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.comingSoon}>🗺️ 实时跟踪</Text>
              <Text style={styles.comingSoonDesc}>
                此功能将显示所有骑手的实时位置，与网站跟踪系统同步
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976d2',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 5,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
  },
  loginForm: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  testButton: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },
  userInfo: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  fullScreen: {
    flex: 1,
  },
  subHeader: {
    backgroundColor: '#1976d2',
    padding: 15,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    marginRight: 15,
  },
  subTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  comingSoon: {
    fontSize: 24,
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
  },
  comingSoonDesc: {
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statusButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  onlineButton: {
    backgroundColor: '#4caf50',
  },
  offlineButton: {
    backgroundColor: '#f44336',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
