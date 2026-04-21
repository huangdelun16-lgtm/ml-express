import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COURIER_ONLINE_MODE_KEY } from './constants/courierOnline';
import { ActivityIndicator, View, Text, Platform, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './contexts/AppContext';
import { notificationService } from './services/notificationService';
import { errorService } from './services/errorService';
import { locationService } from './services/locationService';
import { packageService, supabase } from './services/supabase';
import NetInfo from '@react-native-community/netinfo';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Vibration } from 'react-native';
import { shouldAlertCourierOnNewAssignment } from './utils/packageStatusNormalize';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [userRole, setUserRole] = React.useState<string>('');

  React.useEffect(() => {
    const loadRole = async () => {
      const role = (await AsyncStorage.getItem('currentUserRole')) || 'operator';
      setUserRole(role);
    };
    loadRole();
  }, []);

  if (userRole === 'admin' || userRole === 'manager') {
    return <AdminTabs />;
  }

  return <CourierTabs />;
}

const GlobalOrderMonitor = () => {
  const { t, language } = useApp();
  const [courierName, setCourierName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const announcedOrders = useRef<Set<string>>(new Set());

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
          announcedOrders.current.clear();
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

    console.log('📡 [监控器] 正在启动增强型监听，骑手:', courierName);

    const channelId = `monitor-orders-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
        },
        async (payload) => {
          const { eventType, new: newPkgRaw, old: oldPkgRaw } = payload;
          const newPkg = newPkgRaw as any;
          const oldPkg = oldPkgRaw as any;

          if (!newPkg || !newPkg.id) return;

          const currentCourierClean = courierName.toLowerCase().trim();
          const pkgCourierClean = (newPkg.courier || '').toLowerCase().trim();
          const isMyOrder = pkgCourierClean === currentCourierClean;

          const isNewlyAssigned =
            eventType === 'UPDATE' &&
            oldPkg &&
            (oldPkg.courier || '').toLowerCase().trim() !== pkgCourierClean &&
            isMyOrder;

          const isNewRecord = eventType === 'INSERT' && isMyOrder;

          if ((isNewRecord || isNewlyAssigned) && !announcedOrders.current.has(newPkg.id)) {
            if (shouldAlertCourierOnNewAssignment(newPkg.status)) {
              console.log('🚨 [监控器] 成功捕捉到新任务分配:', newPkg.id);
              announcedOrders.current.add(newPkg.id);

              Vibration.vibrate([0, 800, 200, 800, 200, 800]);

              try {
                const voiceMsg = t.newOrderVoiceAnnouncement;
                const speechLang =
                  language === 'my' ? 'my-MM' : language === 'en' ? 'en-US' : 'zh-CN';

                Speech.stop();
                Speech.speak(voiceMsg, {
                  language: speechLang,
                  pitch: 1.0,
                  rate: 0.85,
                });
              } catch (err) {
                console.warn('语音播放失败:', err);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔌 [监控器] 实时频道状态: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
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
        notificationService.initNotificationListeners();

        const checkTracking = async () => {
          try {
            const courierId = await AsyncStorage.getItem('currentCourierId');
            const onlinePref = await AsyncStorage.getItem(COURIER_ONLINE_MODE_KEY);
            if (courierId && onlinePref !== 'false') {
              await locationService.startBackgroundTracking();
            }
          } catch (e) {
            console.warn('Tracking init error:', e);
          }
        };
        await checkTracking();

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
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <LoadingFallback t={t} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <GlobalOrderMonitor />
      <SyncIndicator />
      <NavigationContainer>
        <Suspense fallback={<NavSuspenseFallback />}>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
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
      </AppProvider>
    </SafeAreaProvider>
  );
}
