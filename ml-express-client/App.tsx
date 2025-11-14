import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeliveryLoadingAnimation from './src/components/DeliveryLoadingAnimation';
import NotificationService from './src/services/notificationService';
import { AppProvider } from './src/contexts/AppContext';
import { LoadingProvider } from './src/contexts/LoadingContext';

// 引入所有页面
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PlaceOrderScreen from './src/screens/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import TrackOrderScreen from './src/screens/TrackOrderScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import NotificationWorkflowScreen from './src/screens/NotificationWorkflowScreen';

const Stack = createNativeStackNavigator();

// Deep Link 配置
const linking = {
  prefixes: ['ml-express-client://', 'https://mlexpress.com', 'https://www.mlexpress.com'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      Main: '',
      PlaceOrder: 'place-order',
      MyOrders: 'my-orders',
      TrackOrder: 'track-order',
      Profile: 'profile',
      OrderDetail: 'order/:orderId',
      NotificationSettings: 'settings/notifications',
      NotificationWorkflow: 'settings/notifications/workflow',
    },
  },
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkLoginStatus();
    initializeNotificationService();
  }, []);

  // 初始化通知服务
  const initializeNotificationService = async () => {
    try {
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

  if (isLoggedIn === null) {
    return <DeliveryLoadingAnimation message="正在启动应用..." showOverlay={true} />;
  }

  return (
    <AppProvider>
      <LoadingProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            initialRouteName={isLoggedIn ? "Main" : "Login"}
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 300,
            }}
          >
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
          </Stack.Navigator>
        </NavigationContainer>
      </LoadingProvider>
    </AppProvider>
  );
}

