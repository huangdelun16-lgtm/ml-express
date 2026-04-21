import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { packageService, supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

export default function MyStatisticsScreen({ navigation }: any) {
  const { language } = useApp();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [statistics, setStatistics] = useState({
    today: { delivered: 0, picked: 0, delivering: 0 },
    week: { delivered: 0, total: 0 },
    month: { delivered: 0, total: 0 },
    total: { delivered: 0, totalPackages: 0 },
    avgDeliveryTime: 0,
    rating: 5.0,
    efficiency: 95,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      setCurrentUserName(userName);
      
      // 🚀 强制从数据库获取最新数据，确保实时性
      const { data: allPackages, error } = await supabase
        .from('packages')
        .select('*')
        .eq('courier', userName);
      
      if (error) throw error;

      const myPackages = allPackages || [];
      
      // 精准匹配今日日期
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      const todayPackages = myPackages.filter(pkg => {
        const createDate = pkg.create_time || pkg.created_at || '';
        return createDate.includes(todayStr);
      });

      // 计算平均配送时间 (单位: 分钟)
      const completedPackages = myPackages.filter(p => p.status === '已送达' && p.delivery_time && p.create_time);
      const avgTime = completedPackages.length > 0 
        ? completedPackages.reduce((sum, p) => {
            const start = new Date(p.create_time).getTime();
            const end = new Date(p.delivery_time).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0) / completedPackages.length
        : 0;

      // 获取评分
      const ratings = myPackages.filter(p => p.customer_rating).map(p => p.customer_rating);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
        : 5.0;

      const stats = {
        today: {
          delivered: todayPackages.filter(p => p.status === '已送达').length,
          picked: todayPackages.filter(p => p.status === '已取件').length,
          delivering: todayPackages.filter(p => ['配送中', '配送进行中'].includes(p.status)).length,
        },
        week: {
          delivered: myPackages.filter(p => {
            const d = new Date(p.delivery_time || p.updated_at || '');
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return p.status === '已送达' && d >= weekAgo;
          }).length,
          total: myPackages.length,
        },
        month: {
          delivered: myPackages.filter(p => {
            const d = new Date(p.delivery_time || p.updated_at || '');
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return p.status === '已送达' && d >= monthAgo;
          }).length,
          total: myPackages.length,
        },
        total: {
          delivered: myPackages.filter(p => p.status === '已送达').length,
          totalPackages: myPackages.length,
        },
        avgDeliveryTime: Math.round(avgTime) || 25,
        rating: avgRating,
        efficiency: myPackages.length > 0 
          ? Math.round((myPackages.filter(p => p.status === '已送达').length / myPackages.length) * 100) 
          : 100,
      };

      setStatistics(stats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 装饰圆形 */}
      <View style={[styles.circle, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
      <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: 'rgba(30, 58, 138, 0.2)' }]} />

      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'zh' ? '我的统计' : 'My Statistics'}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* 用户信息卡片 */}
        <View style={styles.userGlassCard}>
          <View style={styles.userAvatarContainer}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{currentUserName.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.userName}>{currentUserName}</Text>
          <Text style={styles.userRole}>{language === 'zh' ? '官方认证骑手' : 'Certified Courier'}</Text>
        </View>

        {/* 累计数据 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 {language === 'zh' ? '历史累计数据' : 'Overall Performance'}</Text>
          <View style={styles.totalStatsGlassCard}>
            <View style={styles.totalStatItem}>
              <Text style={styles.totalStatNumber}>{statistics.total.delivered}</Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '累计完成' : 'Completed'}</Text>
            </View>
            <View style={styles.glassDivider} />
            <View style={styles.totalStatItem}>
              <Text style={styles.totalStatNumber}>{statistics.total.totalPackages}</Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '接单总数' : 'Total Orders'}</Text>
            </View>
            <View style={styles.glassDivider} />
            <View style={styles.totalStatItem}>
              <Text style={[styles.totalStatNumber, {color: '#10b981'}]}>
                {statistics.total.totalPackages > 0 
                  ? Math.round((statistics.total.delivered / statistics.total.totalPackages) * 100) 
                  : 0}%
              </Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '综合完成率' : 'Success Rate'}</Text>
            </View>
          </View>
        </View>

        {/* 绩效指标 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 {language === 'zh' ? '核心绩效指标' : 'Performance Indicators'}</Text>
          <View style={styles.performanceGlassCard}>
            {[
              { label: language === 'zh' ? '服务评分' : 'Service Rating', value: statistics.rating.toFixed(1), icon: 'star', color: '#fbbf24', percent: (statistics.rating / 5) * 100 },
              { label: language === 'zh' ? '工作效率' : 'Work Efficiency', value: `${statistics.efficiency}%`, icon: 'flash', color: '#10b981', percent: statistics.efficiency },
              { label: language === 'zh' ? '平均配送耗时' : 'Avg Time', value: `${statistics.avgDeliveryTime}min`, icon: 'time', color: '#60a5fa', percent: Math.max(0, 100 - (statistics.avgDeliveryTime / 60) * 100) },
            ].map((item, index) => (
              <View key={index} style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <View style={styles.performanceLabelGroup}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                    <Text style={styles.performanceLabelText}>{item.label}</Text>
                  </View>
                  <Text style={[styles.performanceValue, { color: item.color }]}>{item.value}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={[item.color, item.color + 'aa']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[styles.progressFill, { width: `${item.percent}%` }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 成就徽章 */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>🏅 {language === 'zh' ? '成就徽章' : 'Achievements'}</Text>
          <View style={styles.achievementsGrid}>
            {[
              { icon: '🥇', title: '配送达人', desc: '100单配送', unlocked: statistics.total.delivered >= 100 },
              { icon: '⚡', title: '闪电侠', desc: '准时高效', unlocked: statistics.avgDeliveryTime < 30 },
              { icon: '⭐', title: '五星好评', desc: '零投诉', unlocked: statistics.rating >= 4.8 },
              { icon: '🎯', title: '零失误', desc: '100%完成率', unlocked: statistics.efficiency >= 95 },
            ].map((achievement, index) => (
              <View 
                key={index}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementLocked
                ]}
              >
                <View style={styles.achievementIconBg}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.desc}</Text>
                {achievement.unlocked && (
                  <View style={styles.unlockedTag}>
                    <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                    <Text style={styles.unlockedText}>已达成</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
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
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  userAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  userAvatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#1e3a8a',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  totalStatsGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  totalStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    textAlign: 'center',
  },
  glassDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  performanceGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 20,
  },
  performanceItem: {
    gap: 10,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementLocked: {
    opacity: 0.3,
  },
  achievementIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '800',
  },
});
