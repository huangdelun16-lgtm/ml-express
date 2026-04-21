import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Dimensions,
  Switch,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  supabase,
  systemSettingsService,
  getRegionalPricingForPackage,
} from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import {
  normalizePackageStatusZh,
  isActiveCourierTaskStatus,
} from '../utils/packageStatusNormalize';
import { COURIER_ONLINE_MODE_KEY } from '../constants/courierOnline';
import { locationService } from '../services/locationService';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

function isWaySidePackage(p: { package_type?: string }): boolean {
  const t = (p.package_type || '').trim();
  return t === '顺路递' || t === 'Eco Way' || t === 'တန်တန်လေးပို့';
}

function getRiderEstimatedShareMmk(
  p: {
    price?: string;
    package_type?: string;
    pricing_base_fee_mmk?: number | null;
  },
  pricing: Record<string, number>,
): number {
  const fee = parseFloat(p.price?.toString().replace(/[^\d.]/g, '') || '0');
  if (isWaySidePackage(p)) {
    const fixed = Number(pricing.way_side_courier_per_order) || 0;
    if (fixed > 0) {
      return Math.min(fee, Math.max(0, fixed));
    }
  }
  const snap = p.pricing_base_fee_mmk;
  const base =
    snap != null && Number.isFinite(Number(snap)) && Number(snap) >= 0
      ? Number(snap)
      : pricing.base_fee || 1500;
  return Math.max(0, fee - base);
}

export default function ProfileScreen({ navigation }: any) {
  const { language, t } = useApp();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserPosition, setCurrentUserPosition] = useState('');
  const [courierOnline, setCourierOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [stats, setStats] = useState({
    totalDelivered: 0,
    todayDelivered: 0,
    inProgress: 0,
    totalPlatformPayment: 0,
    todayPlatformPayment: 0,
    todayDeliveryFee: 0,
    todayCOD: 0,
    todayIncome: 0,
    creditScore: 100, // 🚀 新增：信用分
  });

  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
      loadStats();
    }, [])
  );

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '用户';
    const user = await AsyncStorage.getItem('currentUser') || '';
    const userRole = await AsyncStorage.getItem('currentUserRole') || 'operator';
    const position = await AsyncStorage.getItem('currentUserPosition') || '';
    const onlinePref = await AsyncStorage.getItem(COURIER_ONLINE_MODE_KEY);
    setCurrentUserName(userName);
    setCurrentUser(user);
    setCurrentUserRole(userRole);
    setCurrentUserPosition(position);
    setCourierOnline(onlinePref !== 'false');
  };

  const isRider =
    currentUserPosition === '骑手' || currentUserPosition === '骑手队长';

  const setCourierOnlineState = async (next: boolean) => {
    const courierId = await AsyncStorage.getItem('currentCourierId');
    if (!courierId) {
      Alert.alert(
        language === 'zh' ? '提示' : 'Notice',
        language === 'zh'
          ? '未找到骑手档案，请重新登录'
          : 'Courier profile not found. Please login again.',
      );
      return;
    }
    setTogglingOnline(true);
    try {
      if (next) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (!perm.canAskAgain) {
            Alert.alert(t.locationPermissionDenied, t.locationOpenSettingsHint, [
              { text: t.cancel, style: 'cancel' },
              { text: t.openSystemSettings, onPress: () => Linking.openSettings() },
            ]);
          } else {
            Alert.alert(t.tipTitle, t.locationPermissionMessage);
          }
          setTogglingOnline(false);
          return;
        }
      }

      await AsyncStorage.setItem(COURIER_ONLINE_MODE_KEY, next ? 'true' : 'false');
      setCourierOnline(next);
      if (next) {
        await supabase
          .from('couriers')
          .update({
            status: 'active',
            last_active: new Date().toISOString(),
          })
          .eq('id', courierId);
        await locationService.startBackgroundTracking();
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await supabase.from('courier_locations').upsert(
            {
              courier_id: courierId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              last_update: new Date().toISOString(),
            },
            { onConflict: 'courier_id' },
          );
        } catch (e) {
          console.warn('courier_locations 首包同步失败', e);
        }
        DeviceEventEmitter.emit('courier_online_changed', { online: true });
      } else {
        await supabase
          .from('couriers')
          .update({
            status: 'inactive',
            last_active: new Date().toISOString(),
          })
          .eq('id', courierId);
        await locationService.stopBackgroundTracking();
        DeviceEventEmitter.emit('courier_online_changed', { online: false });
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        language === 'zh' ? '失败' : 'Failed',
        language === 'zh' ? '状态更新失败，请重试' : 'Could not update status',
      );
    } finally {
      setTogglingOnline(false);
    }
  };

  const loadStats = async () => {
    try {
      const currentUserName = await AsyncStorage.getItem('currentUserName') || '';
      // 🚀 强制从数据库获取最新数据，避免缓存干扰
      const { data: allPackages, error } = await supabase
        .from('packages')
        .select('*')
        .eq('courier', currentUserName);
      
      if (error) throw error;

      const myPackages = allPackages || [];
      const regionalPricingMap =
        await systemSettingsService.getRegionalPricingMap();
      
      // 归一化状态判定函数
      const isDelivered = (p: any) => {
        const s = (p.status || '').trim();
        return s === '已送达' || s.includes('已送达') || !!p.delivery_time;
      };
      
      const isInProgress = (p: any) => {
        if (isDelivered(p)) return false;
        const s = normalizePackageStatusZh(p.status);
        return isActiveCourierTaskStatus(s);
      };

      const deliveredPackages = myPackages.filter(p => isDelivered(p));
      
      // 🚀 优化：更稳健的“今日”日期获取逻辑 (支持 YYYY-MM-DD 匹配)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // 格式: "2026-01-09"
      
      const todayDelivered = deliveredPackages.filter(p => {
        const dTime = p.delivery_time || p.updated_at || '';
        return dTime.includes(todayStr);
      });

      setStats(prev => ({
        totalDelivered: deliveredPackages.length,
        todayDelivered: todayDelivered.length,
        // 🚀 优化：包含所有配送中的中间状态
        inProgress: myPackages.filter(p => isInProgress(p)).length,
        totalPlatformPayment: deliveredPackages.reduce((sum, p) => {
          const match = p.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
          return sum + (match ? parseFloat(match[1].replace(/,/g, '')) : 0);
        }, 0),
        todayPlatformPayment: todayDelivered.reduce((sum, p) => {
          const match = p.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
          return sum + (match ? parseFloat(match[1].replace(/,/g, '')) : 0);
        }, 0),
        todayDeliveryFee: todayDelivered.reduce((sum, p) => {
          const fee = parseFloat(p.price?.toString().replace(/[^\d.]/g, '') || '0');
          return sum + fee;
        }, 0),
        todayCOD: todayDelivered.reduce((sum, p) => {
          return sum + (p.cod_amount || 0);
        }, 0),
        // 今日预计收入：每单按订单领区计费（曼德勒/仰光互不串用）
        todayIncome: todayDelivered.reduce((sum, p) => {
          const regional = getRegionalPricingForPackage(p, regionalPricingMap);
          return sum + getRiderEstimatedShareMmk(p, regional);
        }, 0),
        creditScore: prev.creditScore,
      }));
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      language === 'zh' ? '确认退出' : language === 'my' ? 'အကောင့်မှထွက်ရန်အတည်ပြုပါ' : 'Confirm Logout',
      language === 'zh' ? '确定要退出登录吗？' : language === 'my' ? 'အကောင့်မှထွက်ရန်သေချာပါသလား?' : 'Are you sure you want to logout?',
      [
        { text: language === 'zh' ? '取消' : language === 'my' ? 'ပယ်ဖျက်ပါ' : 'Cancel', style: 'cancel' },
        {
          text: language === 'zh' ? '退出' : language === 'my' ? 'ထွက်ရန်' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // 如果是骑手，更新快递员状态为离线
              const userPosition = await AsyncStorage.getItem('currentUserPosition');
              if (userPosition === '骑手' || userPosition === '骑手队长') {
                try {
                  const courierId = await AsyncStorage.getItem('currentCourierId');
                  if (courierId) {
                    await supabase
                      .from('couriers')
                      .update({ 
                        last_active: new Date().toISOString(),
                        status: 'inactive'
                      })
                      .eq('id', courierId);
                    console.log('✅ 快递员状态已更新为离线');
                  }
                } catch (error) {
                  console.error('更新快递员离线状态失败:', error);
                }
              }
              
              // 清除所有存储的数据
              await AsyncStorage.clear();
              
              // 重置导航栈到登录页面
              // 获取根导航器（Stack Navigator）
              const rootNavigation = navigation.getParent()?.getParent() || navigation.getParent() || navigation;
              
              rootNavigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('退出登录失败:', error);
              // 如果重置导航失败，尝试直接导航
              navigation.getParent()?.getParent()?.navigate('Login');
            }
          }
        }
      ]
    );
  };

  const getRoleName = (role: string) => {
    const map: Record<string, string> = {
      'admin': language === 'zh' ? '管理员' : language === 'my' ? 'အက်မင်' : 'Admin',
      'manager': language === 'zh' ? '经理' : language === 'my' ? 'မန်နေဂျာ' : 'Manager',
      'operator': language === 'zh' ? '操作员' : language === 'my' ? 'အော်ပရေတာ' : 'Operator',
      'finance': language === 'zh' ? '财务' : language === 'my' ? 'ဘဏ္ဍာရေး' : 'Finance'
    };
    return map[role] || role;
  };

  const menuItems = [
    { 
      icon: '📦', 
      title: language === 'zh' ? '配送历史' : language === 'my' ? 'ပို့ဆောင်မှုမှတ်တမ်း' : 'Delivery History', 
      subtitle: language === 'zh' ? '查看所有配送记录' : language === 'my' ? 'ပို့ဆောင်မှုမှတ်တမ်းအားလုံးကိုကြည့်ရန်' : 'View all delivery records', 
      screen: 'DeliveryHistory' 
    },
    { 
      icon: '📊', 
      title: language === 'zh' ? '我的统计' : language === 'my' ? 'ကျွန်ုပ်၏စာရင်းဇယား' : 'My Statistics', 
      subtitle: language === 'zh' ? '查看配送数据分析' : language === 'my' ? 'ပို့ဆောင်မှုဒေတာခွဲခြမ်းစိတ်ဖြာမှုကိုကြည့်ရန်' : 'View delivery data analysis', 
      screen: 'MyStatistics' 
    },
    { 
      icon: '⚙️', 
      title: language === 'zh' ? '应用设置' : language === 'my' ? 'အက်ပ်ဆက်တင်များ' : 'App Settings', 
      subtitle: language === 'zh' ? '通知、定位等设置' : language === 'my' ? 'အကြောင်းကြားချက်များ၊ တည်နေရာဆက်တင်များ' : 'Notifications, location settings', 
      screen: 'Settings' 
    },
    { 
      icon: '📖', 
      title: language === 'zh' ? '使用帮助' : language === 'my' ? 'အသုံးပြုမှုအကူအညီ' : 'User Guide', 
      subtitle: language === 'zh' ? '功能使用指南' : language === 'my' ? 'လုပ်ဆောင်ချက်အသုံးပြုမှုလမ်းညွှန်' : 'Feature usage guide', 
      action: () => {
        navigation.navigate('Settings', { openHelp: true });
      },
    },
    { 
      icon: '🌐', 
      title: language === 'zh' ? '访问网站' : language === 'my' ? 'ဝဘ်ဆိုက်ကိုလည်ပတ်ရန်' : 'Visit Website', 
      subtitle: 'market-link-express.com', 
      action: () => {
        Linking.openURL('https://market-link-express.com');
      }
    },
  ];

  return (
    <View style={styles.container}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 装饰性圆圈 */}
      <View style={[styles.circle, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
      <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: 'rgba(30, 58, 138, 0.2)' }]} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 用户信息卡片 */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.glassCard}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {currentUserName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{currentUserName}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{getRoleName(currentUserRole)}</Text>
                </View>
                <Text style={styles.userId}>{language === 'zh' ? '账号' : language === 'my' ? 'အကောင့်' : 'ID'}: {currentUser}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.03)']}
            style={styles.statsGlassCard}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.todayDelivered}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '今日完成' : language === 'my' ? 'ယနေ့ပြီးမြောက်' : 'Today'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={styles.statNumber}>{stats.creditScore}</Text>
              </View>
              <Text style={styles.statLabel}>{language === 'zh' ? '信用分' : language === 'my' ? 'ယုံကြည်မှုရမှတ်' : 'Credit'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalDelivered}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '累计完成' : language === 'my' ? 'စုစုပေါင်းပြီးမြောက်' : 'Total'}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* 🚀 优化：今日核心金额统计 (一行一个，防止金额过长) */}
        <View style={[styles.statsContainer, { marginTop: -10 }]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.03)']}
            style={[styles.statsGlassCard, { flexDirection: 'column', padding: 16, gap: 12 }]}
          >
            <View style={styles.statRowVertical}>
              <Text style={styles.statLabelVertical}>{language === 'zh' ? '今日跑腿费' : language === 'my' ? 'ယနေ့ပို့ခ' : 'Today Fee'}</Text>
              <Text style={[styles.statNumberVertical, { color: '#60a5fa' }]}>{stats.todayDeliveryFee.toLocaleString()} <Text style={styles.unitText}>MMK</Text></Text>
            </View>
            <View style={styles.statDividerHorizontal} />
            <View style={styles.statRowVertical}>
              <Text style={styles.statLabelVertical}>{language === 'zh' ? '今日代收 (COD)' : language === 'my' ? 'ယနေ့ COD' : 'Today COD'}</Text>
              <Text style={[styles.statNumberVertical, { color: '#fbbf24' }]}>{stats.todayCOD.toLocaleString()} <Text style={styles.unitText}>MMK</Text></Text>
            </View>
            <View style={styles.statDividerHorizontal} />
            <View style={styles.statRowVertical}>
              <Text style={styles.statLabelVertical}>{language === 'zh' ? '今日余额支付' : language === 'my' ? 'ယနေ့ပလက်ဖောင်းမှပေးချေခြင်း' : 'Today Platform Pay'}</Text>
              <Text style={[styles.statNumberVertical, { color: '#10b981' }]}>{stats.todayPlatformPayment.toLocaleString()} <Text style={styles.unitText}>MMK</Text></Text>
            </View>
            <View style={styles.statDividerHorizontal} />
            <View style={styles.statRowVertical}>
              <Text style={styles.statLabelVertical}>{language === 'zh' ? '今日预计收入' : language === 'my' ? 'ယနေ့ ခန့်မှန်းဝင်ငွေ' : 'Today Income'}</Text>
              <Text style={[styles.statNumberVertical, { color: '#fbbf24' }]}>{stats.todayIncome.toLocaleString()} <Text style={styles.unitText}>MMK</Text></Text>
            </View>
          </LinearGradient>
        </View>

        {/* 骑手：在线接单（与 Admin 实时跟踪 / 待分配派单联动） */}
        {isRider && (
          <View style={[styles.statsContainer, { marginTop: 4 }]}>
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.25)', 'rgba(15, 23, 42, 0.6)']}
              style={styles.onlineCard}
            >
              <View style={styles.onlineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onlineTitle}>
                    {language === 'zh'
                      ? '在线接单'
                      : language === 'my'
                        ? 'အွန်လိုင်းမှာယူရန်'
                        : 'Online for orders'}
                  </Text>
                  <Text style={styles.onlineHint}>
                    {language === 'zh'
                      ? '开启后后台可同步您的位置，管理端「实时跟踪」可派单；收工请关闭以省电'
                      : language === 'my'
                        ? 'ဖွင့်ထားလျှင် တည်နေရာကို ချိတ်ဆက်ပြီး စီမံခန့်ခွဲမှုမှ အော်ဒါခန့်ထားနိုင်သည်'
                        : 'When on, your location syncs so admins can assign orders on Live Tracking.'}
                  </Text>
                </View>
                {togglingOnline ? (
                  <ActivityIndicator color="#10b981" />
                ) : (
                  <Switch
                    value={courierOnline}
                    onValueChange={(v) => setCourierOnlineState(v)}
                    trackColor={{ false: '#475569', true: 'rgba(16, 185, 129, 0.5)' }}
                    thumbColor={courierOnline ? '#10b981' : '#94a3b8'}
                    accessibilityRole="switch"
                    accessibilityLabel={t.a11yOnlineToggle}
                    accessibilityState={{ checked: courierOnline }}
                  />
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* 功能菜单 */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>{language === 'zh' ? '快捷功能' : language === 'my' ? 'အမြန်လုပ်ဆောင်ချက်များ' : 'Quick Actions'}</Text>
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && { borderBottomWidth: 0 }
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={item.subtitle}
                onPress={() => {
                  if ((item as any).action) {
                    (item as any).action();
                  } else if (item.screen) {
                    navigation.navigate(item.screen);
                  } else {
                    Alert.alert(
                      language === 'zh' ? '提示' : language === 'my' ? 'အကြောင်းကြားချက်' : 'Notice', 
                      language === 'zh' ? '功能开发中，敬请期待！' : language === 'my' ? 'လုပ်ဆောင်ချက်များဖွံ့ဖြိုးတိုးတက်နေဆဲ၊ စောင့်ဆိုင်းပါ!' : 'Feature coming soon!'
                    );
                  }
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Text style={styles.menuIconText}>{item.icon}</Text>
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 退出登录按钮 */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={t.a11yLogout}
        >
          <LinearGradient
            colors={['#ef4444', '#b91c1c']}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color="white" style={{marginRight: 8}} />
            <Text style={styles.logoutText}>{language === 'zh' ? '退出登录' : language === 'my' ? 'အကောင့်မှထွက်ရန်' : 'Logout'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 版本信息 */}
        <View style={styles.footer}>
          <Text style={styles.version}>
            MARKET LINK STAFF v{Constants.expoConfig?.version ?? '2.2.1'}
          </Text>
          <Text style={styles.copyright}>© 2025 Market Link Express</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  profileCard: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 18,
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  roleBadgeText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  userId: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  onlineCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  onlineHint: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    lineHeight: 18,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGlassCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statDividerHorizontal: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statRowVertical: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  statLabelVertical: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  statNumberVertical: {
    fontSize: 20,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  version: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  copyright: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 11,
    fontWeight: '500',
  },
});
