import './src/utils/polyfills'; 
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Alert, 
  View, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity, 
  Platform,
  DeviceEventEmitter,
  Vibration,
  Image
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import NotificationService from './src/services/notificationService';
import { AppProvider, useApp } from './src/contexts/AppContext';
import { LoadingProvider } from './src/contexts/LoadingContext';
import { ErrorBoundary } from './src/components/ErrorHandler';
import NetworkStatus from './src/components/NetworkStatus';
import { GlobalToast } from './src/components/GlobalToast';
import { OrderAlertModal } from './src/components/OrderAlertModal';

// 引入商户端相关页面
import HomeScreen from './src/screens/HomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import MerchantProductsScreen from './src/screens/MerchantProductsScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import PlaceOrderScreen from './src/screens/PlaceOrderScreen';

const Stack = createNativeStackNavigator();

// Deep Link 配置 (商户端专用)
const linking = {
  prefixes: ['ml-express-merchants://'],
  config: {
    screens: {
      Login: 'login',
      Welcome: 'welcome',
      Main: '',
      MyOrders: 'my-orders',
      Profile: 'profile',
      OrderDetail: 'order/:orderId',
      MerchantProducts: 'products',
      NotificationCenter: 'notifications',
    },
  },
};

import { analytics, EventType } from './src/services/AnalyticsService';

function AppContent({ onLayoutRootView }: any) {
  const { language, showOrderAlert, setShowOrderAlert, pendingOrders, removePendingOrder } = useApp();

  const handleCloseAlert = () => {
    setShowOrderAlert(false);
    Vibration.cancel(); 
    const Speech = require('expo-speech');
    Speech.stop(); 
  };

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NetworkStatus />
      <GlobalToast />
      <NavigationContainer 
        linking={linking}
        onReady={() => console.log('Merchant App navigation ready')}
      >
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Main" component={HomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="MerchantProducts" component={MerchantProductsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
          <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* 🚀 全局订单提醒 (商户端核心功能) */}
      <OrderAlertModal 
        visible={showOrderAlert}
        orders={pendingOrders}
        language={language}
        onClose={handleCloseAlert}
        onAccepted={(acceptedOrder: any) => {
          if (acceptedOrder) {
            removePendingOrder(acceptedOrder.id);
          }
        }}
        onDeclineSuccess={(orderId: string) => {
          removePendingOrder(orderId);
        }}
        onStatusUpdate={() => {
          DeviceEventEmitter.emit('order_status_updated');
        }}
      />
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        
        // 初始化应用
        const notificationService = NotificationService.getInstance();
        await notificationService.loadSettings();
        notificationService.setupNotificationHandlers();

        analytics.track(EventType.APP_OPEN, {
          platform: Platform.OS,
          version: '1.0.0-merchant'
        });
      } catch (e) {
        console.warn('App prepare error:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <LoadingProvider>
          <AppContent onLayoutRootView={onLayoutRootView} />
        </LoadingProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
