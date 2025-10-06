import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { language } = useApp();
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [refreshing, setRefreshing] = useState(false);
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
    const userName = await AsyncStorage.getItem('currentUserName') || '管理员';
    const userRole = await AsyncStorage.getItem('currentUserRole') || 'admin';
    setCurrentUserName(userName);
    setCurrentUserRole(userRole);
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
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    // 重置导航栈到客户专区
    navigation.getParent()?.getParent()?.reset({
      index: 0,
      routes: [{ name: 'CustomerZone' }],
    });
  };

  // 管理模块卡片数据
  const moduleCards = [
    {
      id: 'packages',
      title: language === 'zh' ? '包裹管理' : 'Package Management',
      subtitle: language === 'zh' ? '查看和管理所有包裹' : 'View and manage all packages',
      icon: '📦',
      color: '#3182ce',
      gradient: ['#3182ce', '#2c5282'],
      screen: 'PackageManagement',
      count: stats.totalPackages,
    },
    {
      id: 'couriers',
      title: language === 'zh' ? '骑手管理' : 'Courier Management',
      subtitle: language === 'zh' ? '快递员信息和业绩' : 'Courier info and performance',
      icon: '🚚',
      color: '#9b59b6',
      gradient: ['#9b59b6', '#8e44ad'],
      screen: 'CourierManagement',
      count: null,
    },
    {
      id: 'finance',
      title: language === 'zh' ? '财务管理' : 'Finance Management',
      subtitle: language === 'zh' ? '收入统计和账务' : 'Income stats and accounting',
      icon: '💰',
      color: '#27ae60',
      gradient: ['#27ae60', '#229954'],
      screen: 'FinanceManagement',
      count: null,
    },
    {
      id: 'settings',
      title: language === 'zh' ? '系统设置' : 'System Settings',
      subtitle: language === 'zh' ? '配置和偏好设置' : 'Configuration and preferences',
      icon: '⚙️',
      color: '#e67e22',
      gradient: ['#e67e22', '#d35400'],
      screen: 'Settings',
      count: null,
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 顶部横幅 */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              👋 {language === 'zh' ? '欢迎回来' : 'Welcome Back'}
            </Text>
            <Text style={styles.userName}>{currentUserName}</Text>
            <Text style={styles.userRole}>
              {currentUserRole === 'admin' ? (language === 'zh' ? '系统管理员' : 'System Admin') : 
               currentUserRole === 'manager' ? (language === 'zh' ? '经理' : 'Manager') : 
               currentUserRole === 'finance' ? (language === 'zh' ? '财务' : 'Finance') : (language === 'zh' ? '操作员' : 'Operator')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutIcon}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* 装饰圆圈 */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </View>

      {/* 统计卡片区域 */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>
          📊 {language === 'zh' ? '今日概览' : "Today's Overview"}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3182ce' }]}>
            <Text style={styles.statNumber}>{stats.totalPackages}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '总包裹' : 'Total'}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
            <Text style={styles.statNumber}>{stats.pendingPackages}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '待取件' : 'Pending'}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>⏰</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
            <Text style={styles.statNumber}>{stats.inProgressPackages}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'In Transit'}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>🚚</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
            <Text style={styles.statNumber}>{stats.completedPackages}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '已完成' : 'Completed'}</Text>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>✅</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 管理模块 */}
      <View style={styles.modulesSection}>
        <Text style={styles.sectionTitle}>
          🎯 {language === 'zh' ? '管理中心' : 'Management Center'}
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
          ⚡ {language === 'zh' ? '快捷操作' : 'Quick Actions'}
        </Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('PackageManagement')}
          >
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionText}>新建包裹</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Text style={styles.quickActionIcon}>📷</Text>
            <Text style={styles.quickActionText}>扫码查询</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.quickActionIcon}>🗺️</Text>
            <Text style={styles.quickActionText}>配送路线</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
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
});
