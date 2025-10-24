import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import { AppProvider, useApp } from './src/contexts/AppContext';
import { LoadingProvider } from './src/contexts/LoadingContext';
import { LinearGradient } from 'expo-linear-gradient';
import DeliveryLoadingAnimation from './src/components/DeliveryLoadingAnimation';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 客户端底部导航
function ClientTabs() {
  const { language } = useApp();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: language === 'zh' ? '首页' : language === 'en' ? 'Home' : 'ပင်မ',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={{ fontSize: 26 }}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="PlaceOrder"
        component={PlaceOrderScreen}
        options={{
          tabBarLabel: language === 'zh' ? '下单' : language === 'en' ? 'Order' : 'အမှာစာ',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={{ fontSize: 26 }}>📦</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: language === 'zh' ? '订单' : language === 'en' ? 'Orders' : 'အမှာစာများ',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={{ fontSize: 26 }}>📋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="TrackOrder"
        component={TrackOrderScreen}
        options={{
          tabBarLabel: language === 'zh' ? '追踪' : language === 'en' ? 'Track' : 'ခြေရာခံ',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={{ fontSize: 26 }}>🔍</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: language === 'zh' ? '我的' : language === 'en' ? 'Profile' : 'ကိုယ်ရေး',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={{ fontSize: 26 }}>👤</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabIconActive: {
    backgroundColor: '#eff6ff',
    transform: [{ scale: 1.1 }],
  },
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

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
        <NavigationContainer>
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
            
            {/* 主应用 */}
            <Stack.Screen 
              name="Main" 
              component={ClientTabs}
              options={{
                animation: 'fade',
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
          </Stack.Navigator>
        </NavigationContainer>
      </LoadingProvider>
    </AppProvider>
  );
}

