import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import RiderHomeScreen from '../screens/rider/RiderHomeScreen';
import RiderOrdersScreen from '../screens/rider/RiderOrdersScreen';
import RiderLocationScreen from '../screens/rider/RiderLocationScreen';
import RiderProfileScreen from '../screens/rider/RiderProfileScreen';

import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

export default function RiderTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'RiderHome') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'RiderOrders') {
            iconName = focused ? 'list-circle' : 'list-circle-outline';
          } else if (route.name === 'RiderLocation') {
            iconName = focused ? 'location' : 'location-outline';
          } else if (route.name === 'RiderProfile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
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
        name="RiderHome" 
        component={RiderHomeScreen} 
        options={{ title: '工作台' }}
      />
      <Tab.Screen 
        name="RiderOrders" 
        component={RiderOrdersScreen} 
        options={{ title: '订单管理' }}
      />
      <Tab.Screen 
        name="RiderLocation" 
        component={RiderLocationScreen} 
        options={{ title: '位置服务' }}
      />
      <Tab.Screen 
        name="RiderProfile" 
        component={RiderProfileScreen} 
        options={{ title: '个人中心' }}
      />
    </Tab.Navigator>
  );
}
