import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

export default function ProfileScreen({ navigation }: any) {
  const { language } = useApp();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [stats, setStats] = useState({
    totalDelivered: 0,
    todayDelivered: 0,
    inProgress: 0,
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
    <ScrollView style={styles.container}>
      {/* 用户信息卡片 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {currentUserName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{currentUserName}</Text>
        <Text style={styles.userRole}>{getRoleName(currentUserRole)}</Text>
        <Text style={styles.userId}>{language === 'zh' ? '账号' : language === 'my' ? 'အကောင့်' : 'Account'}: {currentUser}</Text>
      </View>

      {/* 统计卡片 */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.todayDelivered}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '今日完成' : language === 'my' ? 'ယနေ့ပြီးမြောက်' : 'Today'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : language === 'my' ? 'ပို့ဆောင်နေဆဲ' : 'In Progress'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalDelivered}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '累计完成' : language === 'my' ? 'စုစုပေါင်းပြီးမြောက်' : 'Total'}</Text>
        </View>
      </View>

      {/* 功能菜单 */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              if ((item as any).action) {
                (item as any).action();
              } else if (item.screen) {
                navigation.navigate(item.screen);
              } else {
                Alert.alert(
                  language === 'zh' ? '提示' : language === 'my' ? 'အကြောင်းကြားချက်' : 'Notice', 
                  language === 'zh' ? '功能开发中，敬请期待！' : language === 'my' ? 'လုပ်ဆောင်ချက်များဖွံ့ဖြိုးတိုးတက်နေဆဲ၊ စောင့်ဆိုင်းပါ!' : 'Feature under development, stay tuned!'
                );
              }
            }}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 退出登录按钮 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{language === 'zh' ? '退出登录' : language === 'my' ? 'အကောင့်မှထွက်ရန်' : 'Logout'}</Text>
      </TouchableOpacity>

      {/* 版本信息 */}
      <Text style={styles.version}>
        Market Link Express v1.0.0
      </Text>
      <Text style={styles.copyright}>
        © 2025 Market Link Express
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  profileCard: {
    backgroundColor: '#2c5282',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C0C0C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
  },
  userId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  menuArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  logoutButton: {
    margin: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
  },
  copyright: {
    textAlign: 'center',
    color: '#ccc',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 30,
  },
});
