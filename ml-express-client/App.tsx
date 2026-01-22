import React, { useEffect, useState, useCallback } from 'react';
import { 
  Alert, 
  View, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity, 
  Platform,
  DeviceEventEmitter 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import NotificationService from './src/services/notificationService';
import { AppProvider, useApp } from './src/contexts/AppContext';
import { LoadingProvider } from './src/contexts/LoadingContext';
import { CartProvider } from './src/contexts/CartContext';
import { ErrorBoundary } from './src/components/ErrorHandler';
import NetworkStatus from './src/components/NetworkStatus';
import { GlobalToast } from './src/components/GlobalToast';
import { OrderAlertModal } from './src/components/OrderAlertModal';
// Sentry 已暂时禁用以避免依赖问题
// import { sentryService } from './src/services/SentryService';

// 引入所有页面
import HomeScreen from './src/screens/HomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PlaceOrderScreen from './src/screens/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import TrackOrderScreen from './src/screens/TrackOrderScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import NotificationWorkflowScreen from './src/screens/NotificationWorkflowScreen';
import AddressBookScreen from './src/screens/AddressBookScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import MerchantProductsScreen from './src/screens/MerchantProductsScreen';
import CityMallScreen from './src/screens/CityMallScreen';
import CartScreen from './src/screens/CartScreen';

const Stack = createNativeStackNavigator();

// Deep Link 配置
const linking = {
  prefixes: ['ml-express-client://', 'https://mlexpress.com', 'https://www.mlexpress.com'],
  config: {
    screens: {
      Login: 'login',
      Welcome: 'welcome',
      Register: 'register',
      Main: '',
      PlaceOrder: 'place-order',
      MyOrders: 'my-orders',
      TrackOrder: 'track-order',
      Profile: 'profile',
      OrderDetail: 'order/:orderId',
      NotificationSettings: 'settings/notifications',
      NotificationWorkflow: 'settings/notifications/workflow',
      AddressBook: 'address-book',
      NotificationCenter: 'notifications',
    },
  },
};

import { analytics, EventType } from './src/services/AnalyticsService';

// ...

import { supabase } from './src/services/supabase';
import { Vibration } from 'react-native';

function AppContent({ onLayoutRootView }: any) {
  const { language, showOrderAlert, setShowOrderAlert, newOrderData } = useApp();

  const handleCloseAlert = () => {
    setShowOrderAlert(false);
    Vibration.cancel(); 
    const Speech = require('expo-speech');
    Speech.stop(); // 🚀 停止语音
  };

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NetworkStatus />
      <GlobalToast />
      <NavigationContainer 
        linking={linking}
        onReady={() => {
          console.log('Navigation container ready');
        }}
      >
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* ... */}
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{
              animation: 'fade',
            }}
          />
          
          {/* 登录注册页面 */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          
          {/* 主应用 - 直接显示首页，不使用底部导航 */}
          <Stack.Screen 
            name="Main" 
            component={HomeScreen}
            options={{
              animation: 'fade',
            }}
          />
          
          {/* 使用Stack导航，代替Tab导航 */}
          <Stack.Screen 
            name="PlaceOrder" 
            component={PlaceOrderScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="MyOrders" 
            component={MyOrdersScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="TrackOrder" 
            component={TrackOrderScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          
          {/* 其他页面 */}
          <Stack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="NotificationSettings" 
            component={NotificationSettingsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="NotificationWorkflow" 
            component={NotificationWorkflowScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="AddressBook" 
            component={AddressBookScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="NotificationCenter" 
            component={NotificationCenterScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="MerchantProducts" 
            component={MerchantProductsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="CityMall" 
            component={CityMallScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen 
            name="Cart" 
            component={CartScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* 🚀 全局订单提醒模态框 */}
      <OrderAlertModal 
        visible={showOrderAlert}
        orderData={newOrderData}
        language={language}
        onClose={handleCloseAlert}
        onStatusUpdate={() => {
          console.log('✅ 订单状态已更新，发送全局通知');
          DeviceEventEmitter.emit('order_status_updated');
        }}
      />
    </View>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);

  // 将致命错误保存到本地，方便无 adb 时查看
  const saveErrorToStorage = useCallback(async (tag: string, error: any, isFatal?: boolean) => {
    try {
      const payload = {
        tag,
        isFatal: !!isFatal,
        message: error?.message || String(error),
        stack: error?.stack || '',
        time: new Date().toISOString(),
      };
      await AsyncStorage.setItem('lastFatalError', JSON.stringify(payload));
    } catch (e) {
      console.warn('保存错误信息失败', e);
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // 保持启动屏幕可见
        await SplashScreen.preventAutoHideAsync();
        
        // 关键修复：添加 5 秒超时保护
        // 如果初始化卡住，5秒后强制进入应用，避免白屏被拒
        const safetyTimer = setTimeout(() => {
          setIsLoggedIn((prevState) => {
            if (prevState === null) {
              console.warn('⚠️ 初始化超时，强制进入首页');
              saveErrorToStorage('init_timeout', new Error('App initialization timed out after 5s'), false);
              return false; // 超时默认为未登录
            }
            return prevState;
          });
          // 确保 appIsReady 也被设置
          setAppIsReady(true);
        }, 5000);

        // 正常执行初始化
        await initializeApp();
        
        clearTimeout(safetyTimer);
        
        // 应用启动追踪
        analytics.track(EventType.APP_OPEN, {
          platform: Platform.OS,
          version: '1.1.0'
        });
      } catch (e) {
        console.warn('应用准备阶段出错:', e);
      } finally {
        // 告诉应用已准备好
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // 全局错误兜底：无 adb 时在机上弹窗并写入本地
  useEffect(() => {
    const originalHandler = (ErrorUtils as any)?.getGlobalHandler?.();
    const globalHandler = (error: any, isFatal?: boolean) => {
      saveErrorToStorage('global_error', error, isFatal);
      Alert.alert(
        '应用错误',
        `${isFatal ? '[致命]' : ''}${error?.message || error}`,
      );
      originalHandler?.(error, isFatal);
    };

    (ErrorUtils as any)?.setGlobalHandler?.(globalHandler);

    const originalUnhandled = (global as any).onunhandledrejection;
    (global as any).onunhandledrejection = (event: any) => {
      const reason = event?.reason || event;
      const err = reason instanceof Error ? reason : new Error(String(reason));
      saveErrorToStorage('unhandled_rejection', err, false);
      Alert.alert('Promise 未处理错误', err.message);
      originalUnhandled?.(event);
    };

    return () => {
      if ((ErrorUtils as any)?.setGlobalHandler && originalHandler) {
        (ErrorUtils as any).setGlobalHandler(originalHandler);
      }
      (global as any).onunhandledrejection = originalUnhandled;
    };
  }, [saveErrorToStorage]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync().catch((e) => {
        console.warn('Splash screen hide failed:', e);
      });
    }
  }, [appIsReady]);

  // 新增：安全兜底 useEffect
  // 如果 onLayoutRootView 因为组件切换没有被调用，这个 useEffect 会作为双重保险
  useEffect(() => {
    if (appIsReady) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Effect: Splash screen hide failed:', e);
        }
      };
      hideSplash();
    }
  }, [appIsReady]);

  const initializeApp = async () => {
    try {
      // Sentry 已暂时禁用以避免依赖问题
      // if (!__DEV__) {
      //   sentryService.init();
      // }

      // 初始化通知服务
      await initializeNotificationService();

      // 检查登录状态
      await checkLoginStatus();
    } catch (error) {
      console.error('应用初始化失败:', error);
      // 即使初始化失败，也允许应用继续运行
      await checkLoginStatus();
    }
  };

  // 初始化通知服务
  const initializeNotificationService = async () => {
    try {
      // 检查是否在 Expo Go 中运行
      const Constants = require('expo-constants').default;
      const isExpoGo = __DEV__ && !Constants.expoConfig?.extra?.eas?.projectId;
      
      if (isExpoGo) {
        console.log('⚠️ 在 Expo Go 中运行，跳过通知服务初始化以避免警告');
        return;
      }

      const notificationService = NotificationService.getInstance();
      await notificationService.loadSettings();
      notificationService.setupNotificationHandlers();
      console.log('通知服务初始化成功');
    } catch (error) {
      console.error('通知服务初始化失败:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setIsLoggedIn(!!userId);
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsLoggedIn(false);
    }
  };

  // const onLayoutRootView = useCallback(async () => {
  //   if (appIsReady) {
  //     // 只有当应用准备好后，才隐藏启动屏幕
  //     await SplashScreen.hideAsync();
  //   }
  // }, [appIsReady]);

  if (!appIsReady || isLoggedIn === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2E86AB', justifyContent: 'center', alignItems: 'center' }} onLayout={onLayoutRootView}>
        {/* 即使在初始化阶段也显示背景色，避免纯白屏 */}
        {/* 如果 10 秒还没准备好，显示一个重试按钮 */}
        <LoadingFallback />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <CartProvider>
          <LoadingProvider>
            <AppContent onLayoutRootView={onLayoutRootView} />
          </LoadingProvider>
        </CartProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

// 简单的初始化加载界面
function LoadingFallback() {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ffffff" />
      {showRetry && (
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 }}
          onPress={() => Platform.OS === 'ios' ? Alert.alert('提示', '请尝试重启应用') : null}
        >
          <Text style={{ color: '#ffffff' }}>加载时间过长，请检查网络</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

