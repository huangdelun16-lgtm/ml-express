import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { packageService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      setCurrentUserName(userName);
      
      // 获取快递员的包裹数据
      const packages = await packageService.getAllPackages();
      const myPackages = packages.filter(pkg => pkg.courier === userName);
      
      // 计算统计数据
      const today = new Date().toLocaleDateString('zh-CN');
      const todayPackages = myPackages.filter(pkg => {
        const createDate = new Date(pkg.create_time).toLocaleDateString('zh-CN');
        return createDate === today;
      });

      const stats = {
        today: {
          delivered: todayPackages.filter(p => p.status === '已送达').length,
          picked: todayPackages.filter(p => p.status === '已取件').length,
          delivering: todayPackages.filter(p => p.status === '配送中').length,
        },
        week: {
          delivered: myPackages.filter(p => p.status === '已送达').length,
          total: myPackages.length,
        },
        month: {
          delivered: myPackages.filter(p => p.status === '已送达').length,
          total: myPackages.length,
        },
        total: {
          delivered: myPackages.filter(p => p.status === '已送达').length,
          totalPackages: myPackages.length,
        },
        avgDeliveryTime: 25, // 模拟平均配送时间（分钟）
        rating: 4.8,
        efficiency: 92,
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
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 {language === 'zh' ? '我的统计' : 'My Statistics'}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{currentUserName.charAt(0)}</Text>
          </View>
          <Text style={styles.userName}>{currentUserName}</Text>
          <Text style={styles.userRole}>{language === 'zh' ? '快递员' : 'Courier'}</Text>
          
          {/* 详细分析按钮 */}
          <TouchableOpacity 
            style={styles.analyticsButton}
            onPress={() => navigation.navigate('PerformanceAnalytics')}
          >
            <Text style={styles.analyticsButtonText}>
              📈 {language === 'zh' ? '详细业绩分析' : 'Detailed Analytics'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 今日统计 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📅 {language === 'zh' ? '今日数据' : "Today's Data"}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
              <Text style={styles.statNumber}>{statistics.today.delivered}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '已完成' : 'Completed'}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
              <Text style={styles.statNumber}>{statistics.today.delivering}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'In Transit'}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
              <Text style={styles.statNumber}>{statistics.today.picked}</Text>
              <Text style={styles.statLabel}>{language === 'zh' ? '已取件' : 'Picked Up'}</Text>
            </View>
          </View>
        </View>

        {/* 累计统计 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 {language === 'zh' ? '累计数据' : 'Total Data'}</Text>
          
          <View style={styles.totalStatsCard}>
            <View style={styles.totalStatItem}>
              <Text style={styles.totalStatNumber}>{statistics.total.delivered}</Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '总完成数' : 'Total Completed'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.totalStatItem}>
              <Text style={styles.totalStatNumber}>{statistics.total.totalPackages}</Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '总接单数' : 'Total Orders'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.totalStatItem}>
              <Text style={styles.totalStatNumber}>
                {statistics.total.totalPackages > 0 
                  ? Math.round((statistics.total.delivered / statistics.total.totalPackages) * 100) 
                  : 0}%
              </Text>
              <Text style={styles.totalStatLabel}>{language === 'zh' ? '完成率' : 'Completion Rate'}</Text>
            </View>
          </View>
        </View>

        {/* 绩效指标 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>🎯 {language === 'zh' ? '绩效指标' : 'Performance Metrics'}</Text>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceLabel}>⭐ {language === 'zh' ? '服务评分' : 'Service Rating'}</Text>
                <Text style={styles.performanceValue}>{statistics.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${(statistics.rating / 5) * 100}%`,
                  backgroundColor: '#f39c12'
                }]} />
              </View>
            </View>

            <View style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceLabel}>⚡ {language === 'zh' ? '工作效率' : 'Work Efficiency'}</Text>
                <Text style={styles.performanceValue}>{statistics.efficiency}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${statistics.efficiency}%`,
                  backgroundColor: statistics.efficiency >= 90 ? '#27ae60' : '#f39c12'
                }]} />
              </View>
            </View>

            <View style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceLabel}>⏰ {language === 'zh' ? '平均配送时间' : 'Avg Delivery Time'}</Text>
                <Text style={styles.performanceValue}>{statistics.avgDeliveryTime}{language === 'zh' ? '分钟' : 'min'}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${Math.max(0, 100 - (statistics.avgDeliveryTime / 60) * 100)}%`,
                  backgroundColor: '#3498db'
                }]} />
              </View>
            </View>
          </View>
        </View>

        {/* 时间分析 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📈 趋势分析</Text>
          
          <View style={styles.trendCard}>
            <View style={styles.trendItem}>
              <View style={styles.trendIcon}>
                <Text style={styles.trendIconText}>📅</Text>
              </View>
              <View style={styles.trendContent}>
                <Text style={styles.trendLabel}>本周完成</Text>
                <Text style={styles.trendValue}>{statistics.week.delivered} 单</Text>
                <Text style={styles.trendSubtext}>
                  共 {statistics.week.total} 单任务
                </Text>
              </View>
            </View>

            <View style={styles.trendDivider} />

            <View style={styles.trendItem}>
              <View style={styles.trendIcon}>
                <Text style={styles.trendIconText}>📆</Text>
              </View>
              <View style={styles.trendContent}>
                <Text style={styles.trendLabel}>本月完成</Text>
                <Text style={styles.trendValue}>{statistics.month.delivered} 单</Text>
                <Text style={styles.trendSubtext}>
                  共 {statistics.month.total} 单任务
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 成就徽章 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>🏅 成就徽章</Text>
          
          <View style={styles.achievementsGrid}>
            {[
              { icon: '🥇', title: '配送达人', desc: '完成100单配送', unlocked: statistics.total.delivered >= 100 },
              { icon: '⚡', title: '闪电侠', desc: '平均配送时间<20分钟', unlocked: statistics.avgDeliveryTime < 20 },
              { icon: '⭐', title: '五星好评', desc: '评分≥4.8分', unlocked: statistics.rating >= 4.8 },
              { icon: '🎯', title: '完美主义', desc: '完成率≥95%', unlocked: statistics.efficiency >= 95 },
            ].map((achievement, index) => (
              <View 
                key={index}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementLocked
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.desc}</Text>
                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>✓ 已解锁</Text>
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
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c5282',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  analyticsButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  totalStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  totalStatLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: 20,
  },
  performanceItem: {
    gap: 8,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#f0f4f8',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  trendCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f4f8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trendIconText: {
    fontSize: 24,
  },
  trendContent: {
    flex: 1,
  },
  trendLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 2,
  },
  trendSubtext: {
    fontSize: 12,
    color: '#999',
  },
  trendDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementLocked: {
    opacity: 0.4,
  },
  achievementIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  unlockedBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockedText: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '600',
  },
});
