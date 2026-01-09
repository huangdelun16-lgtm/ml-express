import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { packageService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }: any) {
  const { language } = useApp();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [stats, setStats] = useState({
    totalDelivered: 0,
    todayDelivered: 0,
    inProgress: 0,
    totalPayToMerchant: 0,
    todayPayToMerchant: 0,
  });

  useEffect(() => {
    loadUserInfo();
    loadStats();
  }, []);

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '用户';
    const user = await AsyncStorage.getItem('currentUser') || '';
    const userRole = await AsyncStorage.getItem('currentUserRole') || 'operator';
    setCurrentUserName(userName);
    setCurrentUser(user);
    setCurrentUserRole(userRole);
  };

  const loadStats = async () => {
    try {
      const currentUserName = await AsyncStorage.getItem('currentUserName') || '';
      const packages = await packageService.getAllPackages();
      
      const myPackages = packages.filter(pkg => pkg.courier === currentUserName);
      const deliveredPackages = myPackages.filter(p => p.status === '已送达');
      
      // 今日送达（简化：检查 delivery_time 是否是今天）
      const today = new Date().toLocaleDateString('zh-CN');
      const todayDelivered = deliveredPackages.filter(p => 
        p.delivery_time?.includes(today)
      );

      setStats({
        totalDelivered: deliveredPackages.length,
        todayDelivered: todayDelivered.length,
        inProgress: myPackages.filter(p => ['已取件', '配送中'].includes(p.status)).length,
        totalPayToMerchant: deliveredPackages.reduce((sum, p) => {
          const match = p.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်): (.*?) MMK\]/);
          return sum + (match ? parseFloat(match[1].replace(/,/g, '')) : 0);
        }, 0),
        todayPayToMerchant: todayDelivered.reduce((sum, p) => {
          const match = p.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်): (.*?) MMK\]/);
          return sum + (match ? parseFloat(match[1].replace(/,/g, '')) : 0);
        }, 0),
      });
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
      screen: 'Help' 
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
              <Text style={styles.statNumber}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : language === 'my' ? 'ပို့ဆောင်နေဆဲ' : 'Active'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalDelivered}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '累计完成' : language === 'my' ? 'စုစုပေါင်းပြီးမြောက်' : 'Total'}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* 🚀 新增：付给商家金额统计 */}
        <View style={[styles.statsContainer, { marginTop: -10 }]}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.03)']}
            style={styles.statsGlassCard}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.todayPayToMerchant.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '今日货款' : language === 'my' ? 'ယနေ့ကုန်ဖိုး' : 'Today Pay'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={[styles.statItem, { flex: 1.5 }]}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.totalPayToMerchant.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '累计货款' : language === 'my' ? 'စုစုပေါင်းကုန်ဖိုး' : 'Total Pay'}</Text>
            </View>
          </LinearGradient>
        </View>

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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
          <Text style={styles.version}>Market Link Staff v1.1.2</Text>
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
