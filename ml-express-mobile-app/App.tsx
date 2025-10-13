import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text } from 'react-native';
import { AppProvider, useApp } from './contexts/AppContext';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 管理员/经理底部导航
function AdminTabs() {
  const { language } = useApp();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: language === 'zh' ? '首页' : language === 'en' ? 'Home' : 'ပင်မ',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: language === 'zh' ? '地图' : language === 'en' ? 'Map' : 'မြေပုံ',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🗺️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: language === 'zh' ? '扫码' : language === 'en' ? 'Scan' : 'စကင်န်',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🖼️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: language === 'zh' ? '我的' : language === 'en' ? 'Profile' : 'ကိုယ်ရေး',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// 快递员底部导航
function CourierTabs() {
  const { language } = useApp();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="MyTasks"
        component={MyTasksScreen}
        options={{
          tabBarLabel: language === 'zh' ? '我的任务' : language === 'en' ? 'My Tasks' : 'ကျွန်ုပ်၏တာဝန်',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: language === 'zh' ? '地图' : language === 'en' ? 'Map' : 'မြေပုံ',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🗺️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: language === 'zh' ? '扫码' : language === 'en' ? 'Scan' : 'စကင်န်',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🖼️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: language === 'zh' ? '我的' : language === 'en' ? 'Profile' : 'ကိုယ်ရေး',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>👤</Text>
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
  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  </AppProvider>
  );
}