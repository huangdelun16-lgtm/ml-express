import React, { useEffect, useState, useCallback } from 'react';
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
import { packageService } from './services/supabase';
import NetInfo from '@react-native-community/netinfo';

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