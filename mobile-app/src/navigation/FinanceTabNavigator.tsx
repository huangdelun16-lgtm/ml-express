import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import FinanceHomeScreen from '../screens/finance/FinanceHomeScreen';
import FinanceRecordsScreen from '../screens/finance/FinanceRecordsScreen';
import FinanceReportsScreen from '../screens/finance/FinanceReportsScreen';
import FinanceProfileScreen from '../screens/finance/FinanceProfileScreen';

import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

export default function FinanceTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'FinanceHome') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'FinanceRecords') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'FinanceReports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'FinanceProfile') {
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
        name="FinanceHome" 
        component={FinanceHomeScreen} 
        options={{ title: '财务概览' }}
      />
      <Tab.Screen 
        name="FinanceRecords" 
        component={FinanceRecordsScreen} 
        options={{ title: '财务记录' }}
      />
      <Tab.Screen 
        name="FinanceReports" 
        component={FinanceReportsScreen} 
        options={{ title: '财务报表' }}
      />
      <Tab.Screen 
        name="FinanceProfile" 
        component={FinanceProfileScreen} 
        options={{ title: '个人中心' }}
      />
    </Tab.Navigator>
  );
}
