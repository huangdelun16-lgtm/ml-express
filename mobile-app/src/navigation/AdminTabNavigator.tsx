import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'AdminHome') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AdminUsers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'AdminOrders') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'AdminSettings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="AdminHome" 
        component={AdminHomeScreen} 
        options={{ title: '控制台' }}
      />
      <Tab.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen} 
        options={{ title: '用户管理' }}
      />
      <Tab.Screen 
        name="AdminOrders" 
        component={AdminOrdersScreen} 
        options={{ title: '订单管理' }}
      />
      <Tab.Screen 
        name="AdminSettings" 
        component={AdminSettingsScreen} 
        options={{ title: '系统设置' }}
      />
    </Tab.Navigator>
  );
}
