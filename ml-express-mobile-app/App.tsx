import React, { useEffect, useState, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COURIER_ONLINE_MODE_KEY } from './constants/courierOnline';
import { ActivityIndicator, View, Text, Platform, Alert, TouchableOpacity, StatusBar, AppState, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './contexts/AppContext';
import { notificationService } from './services/notificationService';
import { errorService } from './services/errorService';
import { locationService } from './services/locationService';
import { packageService, supabase } from './services/supabase';
import { startCourierAssignmentWatch } from './services/courierNewOrderMonitor';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  readStaffWorkspaceContext,
  STAFF_WORKSPACE_CHANGED_EVENT,
} from './utils/staffWorkspace';
import type { LanguageTexts } from './utils/i18n';
import LoginScreen from './screens/LoginScreen';
import {
  LazyDashboardScreen,
  LazyCourierHomeScreen,
  LazyMapScreen,
  LazyScanScreen,
  LazyProfileScreen,
  LazyPackageDetailScreen,
  LazyDeliveryHistoryScreen,
  LazyPackageManagementScreen,
  LazyCourierManagementScreen,
  LazyFinanceManagementScreen,
  LazySettingsScreen,
  LazyMyStatisticsScreen,
  LazyPerformanceAnalyticsScreen,
} from './navigation/lazyScreens';
import { SyncIndicator } from './components/SyncIndicator';
import { RoleGuardScreen } from './components/RoleGuardScreen';
import { hasAcceptedLocationDisclosure } from './utils/locationDisclosureStorage';
import LocationDisclosureScreen from './screens/LocationDisclosureScreen';
import * as Linking from 'expo-linking';
import { navigationRef } from './navigation/navigationRef';
import LocationPrecheckModalHost from './components/LocationPrecheckModalHost';
import { GlobalToast } from './components/GlobalToast';

SplashScreen.preventAutoHideAsync().catch(() => {});

const linking = {
  prefixes: [
    Linking.createURL('/'),
    'ml-express-staff://',
    'exp+marketlinkstaffapp://',
  ],
  config: {
    screens: {
      Login: 'login',
      LocationDisclosure: 'location-disclosure',
      Main: {
        path: 'main',
        screens: {
          Dashboard: 'admin',
          MyTasks: 'tasks',
          Map: 'map',
          Scan: 'scan',
          Profile: 'account',
        },
      },
      PackageDetail: {
        path: 'package/:packageId',
        parse: {
          packageId: (id: string) => id,
        },
      },
      DeliveryHistory: 'delivery-history',
      PackageManagement: 'package-management',
      CourierManagement: 'courier-management',
      FinanceManagement: 'finance-management',
      Settings: 'settings',
      MyStatistics: 'statistics',
      PerformanceAnalytics: 'performance',
    },
  },
};

errorService.initGlobalErrorHandler();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AdminTabs() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 75 + Math.max(insets.bottom, 10),
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
        name="Dashboard"
        component={LazyDashboardScreen}
        options={{
          tabBarLabel: t.tabHome,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={LazyMapScreen}
        options={{
          tabBarLabel: t.map,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={LazyScanScreen}
        options={{
          tabBarLabel: t.scan,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'scan' : 'scan-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={LazyProfileScreen}
        options={{
          tabBarLabel: t.tabAccount,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function CourierTabs() {
  const { t } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: '#2c5282',
        tabBarInactiveTintColor: '#999',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 75 + Math.max(insets.bottom, 10),
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
        component={LazyCourierHomeScreen}
        options={{
          tabBarLabel: t.tabMyTasks,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={LazyMapScreen}
        options={{
          tabBarLabel: t.map,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={LazyScanScreen}
        options={{
          tabBarLabel: t.scan,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'scan' : 'scan-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={LazyProfileScreen}
        options={{
          tabBarLabel: t.tabAccount,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const [workspace, setWorkspace] = React.useState<'admin' | 'courier' | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { mode } = await readStaffWorkspaceContext();
      if (!cancelled) setWorkspace(mode);
    })();
    const sub = DeviceEventEmitter.addListener(
      STAFF_WORKSPACE_CHANGED_EVENT,
      (payload?: { mode?: 'admin' | 'courier' }) => {
        if (payload?.mode === 'admin' || payload?.mode === 'courier') {
          setWorkspace(payload.mode);
        }
      },
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  /** 登录并进主界面后再恢复后台追踪（避免启动屏阶段未挂载 Permission 宿主即请求权限，违反 Play 披露顺序） */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await hasAcceptedLocationDisclosure())) return;
        const courierId = await AsyncStorage.getItem('currentCourierId');
        const onlinePref = await AsyncStorage.getItem(COURIER_ONLINE_MODE_KEY);
        if (!courierId || onlinePref === 'false' || cancelled) return;
        await locationService.startBackgroundTracking();
      } catch (e) {
        console.warn('MainTabs resume tracking:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!workspace) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (workspace === 'admin') {
    return <AdminTabs />;
  }

  return <CourierTabs />;
}

const GlobalOrderMonitor = () => {
  const { t, language } = useApp();
  const [courierName, setCourierName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let checkSessionTimer: NodeJS.Timeout | null = null;

    const checkLoginStatus = async () => {
      try {
        const id = await AsyncStorage.getItem('currentUserId');
        const name = await AsyncStorage.getItem('currentUserName');
        const localSessionId = await AsyncStorage.getItem('currentSessionId');

        if (id !== userId) setUserId(id);
        if (name && name.trim() !== (courierName || '').trim()) {
          console.log('👤 [监控器] 检测到骑手登录:', name.trim());
          setCourierName(name.trim());
        } else if (!name && courierName) {
          console.log('👤 [监控器] 检测到骑手登出');
          setCourierName(null);
          setUserId(null);
        }

        if (id && localSessionId) {
          const { data, error } = await supabase
            .from('admin_accounts')
            .select('current_session_id')
            .eq('id', id)
            .single();

          if (!error && data && data.current_session_id && data.current_session_id !== localSessionId) {
            console.log(`🛑 [监控器] 会话不匹配! DB: ${data.current_session_id}, Local: ${localSessionId}`);

            if (checkSessionTimer) clearInterval(checkSessionTimer);

            Alert.alert(t.sessionKickedTitle, t.sessionKickedMessage, [
              {
                text: t.ok,
                onPress: async () => {
                  await AsyncStorage.multiRemove([
                    'currentUserId',
                    'currentUser',
                    'currentUserName',
                    'currentUserRole',
                    'currentUserPosition',
                    'currentSessionId',
                  ]);
                  const Updates = require('expo-updates');
                  Updates.reloadAsync();
                },
              },
            ], { cancelable: false });
          }
        }
      } catch (e) {
        console.error('检查登录状态失败:', e);
      }
    };

    checkLoginStatus();
    const initialTimeout = setTimeout(() => checkLoginStatus(), 5000);
    checkSessionTimer = setInterval(() => checkLoginStatus(), 15000);

    return () => {
      clearTimeout(initialTimeout);
      if (checkSessionTimer) clearInterval(checkSessionTimer);
    };
  }, [courierName, userId, t]);

  useEffect(() => {
    if (!courierName) return;

    const speechLang =
      language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN';

    const stop = startCourierAssignmentWatch({
      courierName,
      voiceText: t.newOrderVoiceAnnouncement,
      speechLang,
      onFreshAssignment: (pkg) => {
        if (AppState.currentState === 'active') return;
        void notificationService.presentLocalNewOrderNotification(
          t.newOrderVoiceAnnouncement,
          pkg.id,
          pkg.id,
        );
      },
    });

    return () => {
      stop();
    };
  }, [courierName, t, language]);

  return null;
};

function NavSuspenseFallback() {
  const { t } = useApp();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={{ marginTop: 12, color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{t.loading}</Text>
    </View>
  );
}

function LoadingFallback({ t }: { t: LanguageTexts }) {
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
          onPress={() =>
            Platform.OS === 'android' ? Alert.alert(t.tipTitle, t.initSlowHint) : null
          }
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{t.initTakingLong}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { t } = useApp();

  useEffect(() => {
    async function prepare() {
      try {
        const safetyTimer = setTimeout(() => {
          setAppIsReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }, 5000);

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

  useEffect(() => {
    const cleanup = notificationService.initNotificationListeners();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        console.log('📶 网络已恢复，正在尝试同步离线数据...');
        packageService.syncOfflineUpdates();
      }
    });

    return () => unsubscribe();
  }, []);

  if (!appIsReady) {
    return (
      <>
        <LocationPrecheckModalHost />
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <LoadingFallback t={t} />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <LocationPrecheckModalHost />
      <GlobalOrderMonitor />
      <SyncIndicator />
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          notificationService.consumeInitialNotificationNavigation().catch(() => {});
        }}
      >
        <Suspense fallback={<NavSuspenseFallback />}>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="LocationDisclosure"
              component={LocationDisclosureScreen}
            />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PackageDetail" component={LazyPackageDetailScreen} />
            <Stack.Screen name="DeliveryHistory" component={LazyDeliveryHistoryScreen} />
            <Stack.Screen name="PackageManagement">
              {(props: any) => (
                <RoleGuardScreen
                  component={LazyPackageManagementScreen}
                  allowedRoles={['admin', 'manager']}
                  navigation={props.navigation}
                  route={props.route}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CourierManagement">
              {(props: any) => (
                <RoleGuardScreen
                  component={LazyCourierManagementScreen}
                  allowedRoles={['admin', 'manager']}
                  navigation={props.navigation}
                  route={props.route}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="FinanceManagement">
              {(props: any) => (
                <RoleGuardScreen
                  component={LazyFinanceManagementScreen}
                  allowedRoles={['admin', 'manager', 'finance']}
                  navigation={props.navigation}
                  route={props.route}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Settings" component={LazySettingsScreen} />
            <Stack.Screen name="MyStatistics" component={LazyMyStatisticsScreen} />
            <Stack.Screen name="PerformanceAnalytics">
              {(props: any) => (
                <RoleGuardScreen
                  component={LazyPerformanceAnalyticsScreen}
                  allowedRoles={['admin', 'manager']}
                  navigation={props.navigation}
                  route={props.route}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </Suspense>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
        <GlobalToast />
      </AppProvider>
    </SafeAreaProvider>
  );
}
