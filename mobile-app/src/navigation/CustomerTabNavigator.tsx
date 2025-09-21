import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import CustomerOrderScreen from '../screens/customer/CustomerOrderScreen';
import CustomerOrderHistoryScreen from '../screens/customer/CustomerOrderHistoryScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

export default function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Order') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
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
        name="Home" 
        component={CustomerHomeScreen} 
        options={{ title: '首页' }}
      />
      <Tab.Screen 
        name="Order" 
        component={CustomerOrderScreen} 
        options={{ title: '下单' }}
      />
      <Tab.Screen 
        name="History" 
        component={CustomerOrderHistoryScreen} 
        options={{ title: '订单历史' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={CustomerProfileScreen} 
        options={{ title: '我的' }}
      />
    </Tab.Navigator>
  );
}
