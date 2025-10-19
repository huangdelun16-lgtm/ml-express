import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface PerformanceStats {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  totalDistance: number;
  averageDeliveryTime: number;
  onTimeRate: number;
  customerRating: number;
  monthlyStats: {
    month: string;
    deliveries: number;
    distance: number;
    rating: number;
  }[];
  dailyStats: {
    date: string;
    deliveries: number;
    distance: number;
    efficiency: number;
  }[];
}

export default function PerformanceAnalyticsScreen({ navigation }: any) {
  const { language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [courierId, setCourierId] = useState<string>('');

  useEffect(() => {
    loadPerformanceData();
  }, [selectedPeriod]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      // 获取当前骑手ID
      const currentCourierId = await AsyncStorage.getItem('currentUserId');
      if (!currentCourierId) {
        Alert.alert('错误', '未找到骑手信息');
        return;
      }
      
      setCourierId(currentCourierId);
      
      // 计算日期范围
      const now = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // 获取包裹数据
      const { data: packages, error } = await supabase
        .from('packages')
        .select('*')
        .eq('courier', currentCourierId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取包裹数据失败:', error);
        return;
      }

      // 计算统计数据
      const performanceStats = calculatePerformanceStats(packages || []);
      setStats(performanceStats);

    } catch (error) {
      console.error('加载业绩数据失败:', error);
      Alert.alert('错误', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceStats = (packages: any[]): PerformanceStats => {
    const totalDeliveries = packages.length;
    const completedDeliveries = packages.filter(p => p.status === '已送达').length;
    const pendingDeliveries = packages.filter(p => ['待取件', '已取件', '配送中'].includes(p.status)).length;
    
    // 计算总距离
    const totalDistance = packages.reduce((sum, pkg) => {
      const distance = parseFloat(pkg.distance || '0');
      return sum + distance;
    }, 0);

    // 计算平均配送时间
    const completedPackages = packages.filter(p => p.status === '已送达' && p.delivered_at);
    const averageDeliveryTime = completedPackages.length > 0 
      ? completedPackages.reduce((sum, pkg) => {
          const created = new Date(pkg.created_at).getTime();
          const delivered = new Date(pkg.delivered_at).getTime();
          return sum + (delivered - created) / (1000 * 60 * 60); // 小时
        }, 0) / completedPackages.length
      : 0;

    // 计算准时率
    const onTimeDeliveries = completedPackages.filter(pkg => {
      if (!pkg.scheduled_delivery_time) return true;
      const scheduled = new Date(pkg.scheduled_delivery_time).getTime();
      const delivered = new Date(pkg.delivered_at).getTime();
      return delivered <= scheduled;
    }).length;
    
    const onTimeRate = completedPackages.length > 0 
      ? (onTimeDeliveries / completedPackages.length) * 100 
      : 0;

    // 计算客户评分
    const ratings = packages.filter(p => p.customer_rating).map(p => p.customer_rating);
    const customerRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    // 计算月度统计
    const monthlyStats = calculateMonthlyStats(packages);
    
    // 计算每日统计
    const dailyStats = calculateDailyStats(packages);

    return {
      totalDeliveries,
      completedDeliveries,
      pendingDeliveries,
      totalDistance,
      averageDeliveryTime,
      onTimeRate,
      customerRating,
      monthlyStats,
      dailyStats
    };
  };

  const calculateMonthlyStats = (packages: any[]) => {
    const monthlyData: { [key: string]: any } = {};
    
    packages.forEach(pkg => {
      const date = new Date(pkg.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          deliveries: 0,
          distance: 0,
          rating: 0,
          ratingCount: 0
        };
      }
      
      monthlyData[monthKey].deliveries++;
      monthlyData[monthKey].distance += parseFloat(pkg.distance || '0');
      
      if (pkg.customer_rating) {
        monthlyData[monthKey].rating += pkg.customer_rating;
        monthlyData[monthKey].ratingCount++;
      }
    });

    return Object.values(monthlyData).map(data => ({
      month: data.month,
      deliveries: data.deliveries,
      distance: data.distance,
      rating: data.ratingCount > 0 ? data.rating / data.ratingCount : 0
    }));
  };

  const calculateDailyStats = (packages: any[]) => {
    const dailyData: { [key: string]: any } = {};
    
    packages.forEach(pkg => {
      const date = new Date(pkg.created_at);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          deliveries: 0,
          distance: 0,
          completed: 0
        };
      }
      
      dailyData[dateKey].deliveries++;
      dailyData[dateKey].distance += parseFloat(pkg.distance || '0');
      
      if (pkg.status === '已送达') {
        dailyData[dateKey].completed++;
      }
    });

    return Object.values(dailyData).map(data => ({
      date: data.date,
      deliveries: data.deliveries,
      distance: data.distance,
      efficiency: data.deliveries > 0 ? (data.completed / data.deliveries) * 100 : 0
    }));
  };

  const renderStatCard = (title: string, value: string | number, subtitle?: string, color: string = '#3b82f6') => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['week', 'month', 'year'] as const).map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period === 'week' ? (language === 'zh' ? '本周' : 'This Week') :
             period === 'month' ? (language === 'zh' ? '本月' : 'This Month') :
             (language === 'zh' ? '本年' : 'This Year')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>
          {language === 'zh' ? '加载业绩数据中...' : 'Loading performance data...'}
        </Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {language === 'zh' ? '暂无业绩数据' : 'No performance data available'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPerformanceData}>
          <Text style={styles.retryButtonText}>
            {language === 'zh' ? '重新加载' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          📈 {language === 'zh' ? '业绩分析' : 'Performance Analytics'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderPeriodSelector()}

        {/* 主要统计卡片 */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            language === 'zh' ? '总配送数' : 'Total Deliveries',
            stats.totalDeliveries,
            language === 'zh' ? '包裹数量' : 'Packages',
            '#3b82f6'
          )}
          {renderStatCard(
            language === 'zh' ? '已完成' : 'Completed',
            stats.completedDeliveries,
            language === 'zh' ? '已送达' : 'Delivered',
            '#10b981'
          )}
          {renderStatCard(
            language === 'zh' ? '总距离' : 'Total Distance',
            `${stats.totalDistance.toFixed(1)}km`,
            language === 'zh' ? '配送里程' : 'Delivery Miles',
            '#f59e0b'
          )}
          {renderStatCard(
            language === 'zh' ? '平均时间' : 'Avg Time',
            `${stats.averageDeliveryTime.toFixed(1)}h`,
            language === 'zh' ? '配送时长' : 'Delivery Time',
            '#8b5cf6'
          )}
          {renderStatCard(
            language === 'zh' ? '准时率' : 'On-Time Rate',
            `${stats.onTimeRate.toFixed(1)}%`,
            language === 'zh' ? '准时送达' : 'On-Time Delivery',
            '#ef4444'
          )}
          {renderStatCard(
            language === 'zh' ? '客户评分' : 'Customer Rating',
            stats.customerRating.toFixed(1),
            language === 'zh' ? '平均评分' : 'Average Rating',
            '#f97316'
          )}
        </View>

        {/* 月度趋势 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 {language === 'zh' ? '月度趋势' : 'Monthly Trends'}
          </Text>
          <View style={styles.trendContainer}>
            {stats.monthlyStats.slice(0, 6).map((month, index) => (
              <View key={month.month} style={styles.trendItem}>
                <Text style={styles.trendMonth}>{month.month}</Text>
                <View style={styles.trendBar}>
                  <View 
                    style={[
                      styles.trendBarFill, 
                      { height: `${Math.min(100, (month.deliveries / Math.max(...stats.monthlyStats.map(m => m.deliveries))) * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.trendValue}>{month.deliveries}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 每日效率 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📅 {language === 'zh' ? '每日效率' : 'Daily Efficiency'}
          </Text>
          <View style={styles.dailyContainer}>
            {stats.dailyStats.slice(0, 7).map((day, index) => (
              <View key={day.date} style={styles.dailyItem}>
                <Text style={styles.dailyDate}>
                  {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.dailyDeliveries}>{day.deliveries}</Text>
                <Text style={styles.dailyEfficiency}>
                  {day.efficiency.toFixed(0)}%
                </Text>
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
    backgroundColor: '#f7fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3b82f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    width: (width - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendMonth: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
  },
  trendBar: {
    width: 20,
    height: 60,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  trendBarFill: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minHeight: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  dailyContainer: {
    gap: 8,
  },
  dailyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dailyDate: {
    fontSize: 12,
    color: '#666',
    width: 60,
  },
  dailyDeliveries: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    width: 40,
    textAlign: 'center',
  },
  dailyEfficiency: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
});
