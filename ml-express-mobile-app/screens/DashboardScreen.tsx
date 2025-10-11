import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { language, setLanguage } = useApp();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPackages: 0,
    pendingPackages: 0,
    inProgressPackages: 0,
    completedPackages: 0,
  });

  useEffect(() => {
    loadUserInfo();
    loadStats();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userName = await AsyncStorage.getItem('currentUserName') || '管理员';
      const userRole = await AsyncStorage.getItem('currentUserRole') || 'admin';
      setCurrentUserName(userName);
      setCurrentUserRole(userRole);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const packages = await packageService.getAllPackages();
      setStats({
        totalPackages: packages.length,
        pendingPackages: packages.filter(p => p.status === '待取件').length,
        inProgressPackages: packages.filter(p => ['已取件', '配送中'].includes(p.status)).length,
        completedPackages: packages.filter(p => p.status === '已送达').length,
      });
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c5282" />
        <Text style={styles.loadingText}>
          {language === 'zh' ? '加载中...' : language === 'en' ? 'Loading...' : 'တင်၍နေသည်...'}
        </Text>
      </View>
    );
  }

  const handleLogout = async () => {
    await AsyncStorage.clear();
    // 重置导航栈到客户专区
    navigation.getParent()?.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  // 语言切换处理
  const handleLanguageChange = async (newLanguage: string) => {
    await setLanguage(newLanguage);
    setShowLanguageModal(false);
  };

  // 多语言翻译对象
  const t = {
    zh: {
      welcome: '欢迎回来',
      todayOverview: '今日概览',
      managementCenter: '管理中心',
      quickActions: '快捷操作',
      total: '总包裹',
      pending: '待取件',
      inTransit: '配送中',
      completed: '已完成',
      packageManagement: '包裹管理',
      packageManagementDesc: '查看和管理所有包裹',
      courierManagement: '骑手管理',
      courierManagementDesc: '快递员信息和业绩',
      financeManagement: '财务管理',
      financeManagementDesc: '收入统计和账务',
      systemSettings: '系统设置',
      systemSettingsDesc: '配置和偏好设置',
      systemAdmin: '系统管理员',
      manager: '经理',
      finance: '财务',
      operator: '操作员',
      language: '语言',
      chinese: '中文',
      english: 'English',
      burmese: 'မြန်မာ',
    },
    en: {
      welcome: 'Welcome Back',
      todayOverview: "Today's Overview",
      managementCenter: 'Management Center',
      quickActions: 'Quick Actions',
      total: 'Total',
      pending: 'Pending',
      inTransit: 'In Transit',
      completed: 'Completed',
      packageManagement: 'Package Management',
      packageManagementDesc: 'View and manage all packages',
      courierManagement: 'Courier Management',
      courierManagementDesc: 'Courier info and performance',
      financeManagement: 'Finance Management',
      financeManagementDesc: 'Income stats and accounting',
      systemSettings: 'System Settings',
      systemSettingsDesc: 'Configuration and preferences',
      systemAdmin: 'System Admin',
      manager: 'Manager',
      finance: 'Finance',
      operator: 'Operator',
      language: 'Language',
      chinese: '中文',
      english: 'English',
      burmese: 'မြန်မာ',
    },
    my: {
      welcome: 'ပြန်လည်ကြိုဆိုပါတယ်',
      todayOverview: 'ယနေ့ အခြေအနေ',
      managementCenter: 'စီမံခန့်ခွဲမှု စင်တာ',
      quickActions: 'လျင်မြန်သော လုပ်ဆောင်ချက်များ',
      total: 'စုစုပေါင်း',
      pending: 'စောင့်ဆိုင်းနေသော',
      inTransit: 'ပို့ဆောင်နေသော',
      completed: 'ပြီးမြောက်ပြီး',
      packageManagement: 'ထုပ်ပိုးစီမံခန့်ခွဲမှု',
      packageManagementDesc: 'ထုပ်ပိုးများအားလုံးကို ကြည့်ရှုနှင့် စီမံခန့်ခွဲခြင်း',
      courierManagement: 'ပို့ဆောင်သူ စီမံခန့်ခွဲမှု',
      courierManagementDesc: 'ပို့ဆောင်သူ အချက်အလက်နှင့် စွမ်းဆောင်ရည်',
      financeManagement: 'ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု',
      financeManagementDesc: 'ဝင်ငွေ စာရင်းနှင့် စာရင်းကိုင်',
      systemSettings: 'စနစ် ဆက်တင်များ',
      systemSettingsDesc: 'ဖွဲ့စည်းမှုနှင့် ဦးစားပေးချက်များ',
      systemAdmin: 'စနစ် အက်မင်',
      manager: 'မန်နေဂျာ',
      finance: 'ဘဏ္ဍာရေး',
      operator: 'လုပ်ဆောင်သူ',
      language: 'ဘာသာစကား',
      chinese: '中文',
      english: 'English',
      burmese: 'မြန်မာ',
    },
  };

  const currentT = t[language as keyof typeof t] || t.zh;

  // 管理模块卡片数据
  const moduleCards = [
    {
      id: 'packages',
      title: currentT.packageManagement,
      subtitle: currentT.packageManagementDesc,
      icon: '📦',
      color: '#3182ce',
      gradient: ['#3182ce', '#2c5282'],
      screen: 'PackageManagement',
      count: stats.totalPackages,
    },
    {
      id: 'couriers',
      title: currentT.courierManagement,
      subtitle: currentT.courierManagementDesc,
      icon: '🚚',
      color: '#9b59b6',
      gradient: ['#9b59b6', '#8e44ad'],
      screen: 'CourierManagement',
      count: null,
    },
    {
      id: 'finance',
      title: currentT.financeManagement,
      subtitle: currentT.financeManagementDesc,
      icon: '💰',
      color: '#27ae60',
      gradient: ['#27ae60', '#229954'],
      screen: 'FinanceManagement',
      count: null,
    },
    {
      id: 'settings',
      title: currentT.systemSettings,
      subtitle: currentT.systemSettingsDesc,
      icon: '⚙️',
      color: '#e67e22',
      gradient: ['#e67e22', '#d35400'],
      screen: 'Settings',
      count: null,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* 顶部横幅 */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              👋 {currentT.welcome}
            </Text>
            <Text style={styles.userName}>{currentUserName}</Text>
            <Text style={styles.userRole}>
              {currentUserRole === 'admin' ? currentT.systemAdmin : 
               currentUserRole === 'manager' ? currentT.manager : 
               currentUserRole === 'finance' ? currentT.finance : currentT.operator}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={() => setShowLanguageModal(true)} 
              style={styles.languageButton}
            >
              <Text style={styles.languageIcon}>🌐</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 装饰圆圈 */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </View>

      {/* 统计卡片区域 */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>
          📊 {currentT.todayOverview}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3182ce' }]}>
            <Text style={styles.statNumber}>{stats.totalPackages}</Text>
            <Text style={styles.statLabel}>{currentT.total}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
            <Text style={styles.statNumber}>{stats.pendingPackages}</Text>
            <Text style={styles.statLabel}>{currentT.pending}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>⏰</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
            <Text style={styles.statNumber}>{stats.inProgressPackages}</Text>
            <Text style={styles.statLabel}>{currentT.inTransit}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>🚚</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
            <Text style={styles.statNumber}>{stats.completedPackages}</Text>
            <Text style={styles.statLabel}>{currentT.completed}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>✅</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 管理模块 */}
      <View style={styles.modulesSection}>
        <Text style={styles.sectionTitle}>
          🎯 {currentT.managementCenter}
        </Text>
        <View style={styles.modulesGrid}>
          {moduleCards.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.moduleCard, { backgroundColor: module.color }]}
              onPress={() => {
                if (module.screen) {
                  navigation.navigate(module.screen);
                }
              }}
              activeOpacity={0.8}
            >
              {/* 背景渐变效果（用半透明层模拟）*/}
              <View style={styles.cardOverlay} />
              
              {/* 图标 */}
              <View style={styles.moduleIconContainer}>
                <Text style={styles.moduleIcon}>{module.icon}</Text>
              </View>

              {/* 标题 */}
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>

              {/* 数量徽章 */}
              {module.count !== null && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{module.count}</Text>
                </View>
              )}

              {/* 箭头 */}
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 快捷操作 */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>
          ⚡ {currentT.quickActions}
        </Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('PackageManagement')}
          >
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionText}>
              {language === 'zh' ? '新建包裹' : language === 'en' ? 'New Package' : 'ထုပ်ပိုးအသစ်'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Text style={styles.quickActionIcon}>📷</Text>
            <Text style={styles.quickActionText}>
              {language === 'zh' ? '扫码查询' : language === 'en' ? 'Scan Query' : 'စကင်န်ဖတ်ခြင်း'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.quickActionIcon}>🗺️</Text>
            <Text style={styles.quickActionText}>
              {language === 'zh' ? '配送路线' : language === 'en' ? 'Delivery Route' : 'ပို့ဆောင်လမ်းကြောင်း'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 语言切换模态框 */}
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🌐 {currentT.language}</Text>
            <TouchableOpacity 
              onPress={() => setShowLanguageModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.languageOptions}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'zh' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('zh')}
            >
              <Text style={[
                styles.languageOptionText,
                language === 'zh' && styles.languageOptionTextActive
              ]}>
                🇨🇳 {currentT.chinese}
              </Text>
              {language === 'zh' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={[
                styles.languageOptionText,
                language === 'en' && styles.languageOptionTextActive
              ]}>
                🇺🇸 {currentT.english}
              </Text>
              {language === 'en' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'my' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('my')}
            >
              <Text style={[
                styles.languageOptionText,
                language === 'my' && styles.languageOptionTextActive
              ]}>
                🇲🇲 {currentT.burmese}
              </Text>
              {language === 'my' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2c5282',
    fontWeight: '500',
  },
  headerBanner: {
    backgroundColor: '#1a365d',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  logoutButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoutIcon: {
    fontSize: 20,
  },
  decorCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(49,130,206,0.15)',
    top: -50,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(192,192,192,0.1)',
    bottom: -20,
    left: -20,
  },
  statsSection: {
    padding: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  statIconBg: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  modulesSection: {
    padding: 20,
    paddingTop: 8,
  },
  modulesGrid: {
    gap: 16,
  },
  moduleCard: {
    height: 140,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  moduleIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    fontSize: 28,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  moduleSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  countBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  countText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  arrow: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.7)',
  },
  quickActionsSection: {
    padding: 20,
    paddingTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  // 头部按钮样式
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  languageIcon: {
    fontSize: 18,
    color: '#fff',
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  languageOptions: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
  },
  languageOptionTextActive: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: 'bold',
  },
});
