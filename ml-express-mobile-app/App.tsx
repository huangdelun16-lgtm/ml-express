import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, Platform, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './contexts/AppContext';
import { notificationService } from './services/notificationService';
import { errorService } from './services/errorService';
import { locationService } from './services/locationService';
import { packageService, supabase } from './services/supabase';
import NetInfo from '@react-native-community/netinfo';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Vibration } from 'react-native';
import { shouldAlertCourierOnNewAssignment } from './utils/packageStatusNormalize';

// 🚀 定义后台定位任务名称
// 已迁移至 services/locationService.ts

// 保持启动页可见
SplashScreen.preventAutoHideAsync().catch(() => {});

// 初始化全局错误拦截
errorService.initGlobalErrorHandler();

// 引入所有页面
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import CourierHomeScreen from './screens/CourierHomeScreen';
import MapScreen from './screens/MapScreen';
import ScanScreen from './screens/ScanScreen';
import ProfileScreen from './screens/ProfileScreen';
import PackageDetailScreen from './screens/PackageDetailScreen';
import DeliveryHistoryScreen from './screens/DeliveryHistoryScreen';
import PackageManagementScreen from './screens/PackageManagementScreen';
import CourierManagementScreen from './screens/CourierManagementScreen';
import FinanceManagementScreen from './screens/FinanceManagementScreen';
import SettingsScreen from './screens/SettingsScreen';
import MyTasksScreen from './screens/MyTasksScreen';
import MyStatisticsScreen from './screens/MyStatisticsScreen';
import PerformanceAnalyticsScreen from './screens/PerformanceAnalyticsScreen';
import { SyncIndicator } from './components/SyncIndicator';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 管理员/经理底部导航
function AdminTabs() {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 + insets.bottom : (75 + Math.max(insets.bottom, 10)),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 5 : Math.max(insets.bottom, 12),
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          elevation: 20, // 显著提高层级，防止系统条穿透
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: Platform.OS === 'android' ? 8 : 0, // 增加安卓文字底部间距，远离系统按键
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: language === 'zh' ? '首页' : language === 'en' ? 'Home' : 'ပင်မ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: language === 'zh' ? '地图' : language === 'en' ? 'Map' : 'မြေပုံ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: language === 'zh' ? '扫码' : language === 'en' ? 'Scan' : 'စကင်န်',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'scan' : 'scan-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: language === 'zh' ? '账号' : language === 'en' ? 'Profile' : 'အကောင့်',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// 快递员底部导航
function CourierTabs() {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 + insets.bottom : (75 + Math.max(insets.bottom, 10)),
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 5 : Math.max(insets.bottom, 12),
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: Platform.OS === 'android' ? 8 : 0,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="MyTasks"
        component={MyTasksScreen}
        options={{
          tabBarLabel: language === 'zh' ? '我的任务' : language === 'en' ? 'My Tasks' : 'ကျွန်ုပ်၏တာဝန်',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'cube' : 'cube-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: language === 'zh' ? '地图' : language === 'en' ? 'Map' : 'မြေပုံ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: language === 'zh' ? '扫码' : language === 'en' ? 'Scan' : 'စကင်န်',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'scan' : 'scan-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: language === 'zh' ? '账号' : language === 'en' ? 'Profile' : 'အကောင့်',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// 主Tab路由（根据角色选择）
function MainTabs() {
  const [userRole, setUserRole] = React.useState<string>('');

  React.useEffect(() => {
    const loadRole = async () => {
      const role = await AsyncStorage.getItem('currentUserRole') || 'operator';
      setUserRole(role);
    };
    loadRole();
  }, []);

  // 管理员和经理显示管理界面
  if (userRole === 'admin' || userRole === 'manager') {
    return <AdminTabs />;
  }
  
  // 快递员和其他角色显示快递员界面
  return <CourierTabs />;
}

// 🚀 全局订单实时监控组件
// 负责在 App 运行期间监听新订单分配，并强制执行语音和震动提醒
// 🚀 新增：会话同步检查逻辑
const GlobalOrderMonitor = () => {
  const [courierName, setCourierName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const announcedOrders = useRef<Set<string>>(new Set()); // 记录本轮已播报过的订单 ID
  
  useEffect(() => {
    let checkSessionTimer: NodeJS.Timeout | null = null;

    const checkLoginStatus = async (isInitial = false) => {
      try {
        const id = await AsyncStorage.getItem('currentUserId');
        const name = await AsyncStorage.getItem('currentUserName');
        const localSessionId = await AsyncStorage.getItem('currentSessionId');

        // 1. 同步 ID 和 姓名状态
        if (id !== userId) setUserId(id);
        if (name && name.trim() !== (courierName || '').trim()) {
          console.log('👤 [监控器] 检测到骑手登录:', name.trim());
          setCourierName(name.trim());
        } else if (!name && courierName) {
          console.log('👤 [监控器] 检测到骑手登出');
          setCourierName(null);
          setUserId(null);
          announcedOrders.current.clear();
        }

        // 2. 🚀 核心逻辑：多设备登录检查
        if (id && localSessionId) {
          const { data, error } = await supabase
            .from('admin_accounts')
            .select('current_session_id')
            .eq('id', id)
            .single();
          
          if (!error && data && data.current_session_id && data.current_session_id !== localSessionId) {
            console.log(`🛑 [监控器] 会话不匹配! DB: ${data.current_session_id}, Local: ${localSessionId}`);
            
            if (checkSessionTimer) clearInterval(checkSessionTimer);

            Alert.alert(
              '登录状态异常',
              '您的账号已在其他设备登录，当前设备已被强制下线。',
              [{ 
                text: '确定', 
                onPress: async () => {
                  await AsyncStorage.multiRemove([
                    'currentUserId', 'currentUser', 'currentUserName', 
                    'currentUserRole', 'currentUserPosition', 'currentSessionId'
                  ]);
                  const Updates = require('expo-updates');
                  Updates.reloadAsync();
                } 
              }],
              { cancelable: false }
            );
          }
        }
      } catch (e) {
        console.error('检查登录状态失败:', e);
      }
    };

    checkLoginStatus(true);
    // 延迟 5 秒执行第一次检查，避免登录竞态
    const initialTimeout = setTimeout(() => checkLoginStatus(), 5000);
    checkSessionTimer = setInterval(() => checkLoginStatus(), 15000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkSessionTimer) clearInterval(checkSessionTimer);
    };
  }, [courierName, userId]);

  useEffect(() => {
    if (!courierName) return;

    console.log('📡 [监控器] 正在启动增强型监听，骑手:', courierName);

    const channelId = `monitor-orders-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        async (payload) => {
          const { eventType, new: newPkgRaw, old: oldPkgRaw } = payload;
          const newPkg = newPkgRaw as any;
          const oldPkg = oldPkgRaw as any;
          
          if (!newPkg || !newPkg.id) return;

          // 🚀 核心改进：执行不区分大小写且去除空格的匹配
          const currentCourierClean = courierName.toLowerCase().trim();
          const pkgCourierClean = (newPkg.courier || '').toLowerCase().trim();
          const isMyOrder = pkgCourierClean === currentCourierClean;

          // 判定是否需要播报：
          // 1. 是一条新插入且指派给我的记录
          // 2. 是更新操作，且指派对象从别人变成了我（或从空变我）
          const isNewlyAssigned = eventType === 'UPDATE' && 
                                oldPkg &&
                                (oldPkg.courier || '').toLowerCase().trim() !== pkgCourierClean && 
                                isMyOrder;
          
          const isNewRecord = eventType === 'INSERT' && isMyOrder;

          if ((isNewRecord || isNewlyAssigned) && !announcedOrders.current.has(newPkg.id)) {
            // 与网站「活跃订单」一致：进行中状态才播报（含待确认、打包中等）
            if (shouldAlertCourierOnNewAssignment(newPkg.status)) {
              console.log('🚨 [监控器] 成功捕捉到新任务分配:', newPkg.id);
              announcedOrders.current.add(newPkg.id);
              
              // 1. 强力震动 (三连振)
              Vibration.vibrate([0, 800, 200, 800, 200, 800]);
              
              // 2. 强力语音播报
              try {
                const lang = await AsyncStorage.getItem('ml-express-language') || 'zh';
                let voiceMsg = '';
                if (lang === 'my') {
                  voiceMsg = 'သင့်တွင် မြို့တွင်းပို့ဆောင်ရေး အော်ဒါအသစ်တစ်ခုရှိသည်။ ကျေးဇူးပြု၍ အချိန်မီစစ်ဆေးပါ။';
                } else if (lang === 'en') {
                  voiceMsg = 'You have a new local delivery order. Please check it in time.';
                } else {
                  voiceMsg = '您有新的同城配送订单，请及时查看';
                }

                Speech.stop(); // 停止当前所有播放，新通知最高优先级
                Speech.speak(voiceMsg, {
                  language: lang === 'my' ? 'my-MM' : lang === 'en' ? 'en-US' : 'zh-CN',
                  pitch: 1.0,
                  rate: 0.85,
                });
              } catch (err) {
                console.warn('语音播放失败:', err);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔌 [监控器] 实时频道状态: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courierName]);

  return null;
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 关键修复：添加 5 秒超时保护
        const safetyTimer = setTimeout(() => {
          setAppIsReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }, 5000);

        // 初始化通知服务
        const initNotifications = async () => {
          try {
            const token = await notificationService.registerForPushNotificationsAsync();
            if (token) {
              await notificationService.savePushTokenToSupabase(token);
            }
          } catch (e) {
            console.warn('Notification init error:', e);
          }
        };

        await initNotifications();
        notificationService.initNotificationListeners();

        // 检查并启动后台位置追踪
        const checkTracking = async () => {
          try {
            const courierId = await AsyncStorage.getItem('currentCourierId');
            if (courierId) {
              await locationService.startBackgroundTracking();
            }
          } catch (e) {
            console.warn('Tracking init error:', e);
          }
        };
        await checkTracking();

        // 🚀 启动时同步一次离线数据
        await packageService.syncOfflineUpdates();

        clearTimeout(safetyTimer);
      } catch (e) {
        console.warn('App preparation error:', e);
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  // 🚀 离线同步逻辑：监听网络变化并自动同步
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        console.log('📶 网络已恢复，正在尝试同步离线数据...');
        packageService.syncOfflineUpdates();
      }
    });

    return () => unsubscribe();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <LoadingFallback />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <GlobalOrderMonitor />
        <SyncIndicator />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* 员工登录页面 */}
            <Stack.Screen name="Login" component={LoginScreen} />
            
            {/* 管理系统（需要登录验证） */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* 其他页面 */}
            <Stack.Screen name="PackageDetail" component={PackageDetailScreen} />
            <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} />
            <Stack.Screen name="PackageManagement" component={PackageManagementScreen} />
          <Stack.Screen name="CourierManagement" component={CourierManagementScreen} />
          <Stack.Screen name="FinanceManagement" component={FinanceManagementScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="MyStatistics" component={MyStatisticsScreen} />
          <Stack.Screen name="PerformanceAnalytics" component={PerformanceAnalyticsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  </SafeAreaProvider>
  );
}

function LoadingFallback() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ alignItems: 'center', marginTop: 20 }}>
      {showRetry && (
        <TouchableOpacity 
          style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
          onPress={() => Platform.OS === 'android' ? Alert.alert('提示', '如果长时间无法进入，请检查网络或重启应用') : null}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>初始化时间较长...</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}