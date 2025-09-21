import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  FAB,
  Badge,
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { riderService } from '../../services/api';
import { colors } from '../../theme/theme';

interface RiderStats {
  todayOrders: number;
  todayEarnings: number;
  completedOrders: number;
  pendingOrders: number;
  status: 'online' | 'offline' | 'busy';
}

export default function RiderHomeScreen() {
  const { user } = useAuth();
  const [riderStatus, setRiderStatus] = useState<'online' | 'offline' | 'busy'>('offline');
  const [stats, setStats] = useState<RiderStats>({
    todayOrders: 0,
    todayEarnings: 0,
    completedOrders: 0,
    pendingOrders: 0,
    status: 'offline',
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRiderData();
  }, []);

  const loadRiderData = async () => {
    try {
      setLoading(true);
      
      // 获取骑手今日订单
      const ordersResponse = await riderService.getOrders(user?.id || '');
      
      if (ordersResponse.success) {
        const orders = ordersResponse.data.items || [];
        const today = new Date().toDateString();
        
        const todayOrders = orders.filter((order: any) => 
          new Date(order.createdAt).toDateString() === today
        );
        
        const completedToday = todayOrders.filter((order: any) => 
          order.status === '已签收'
        );
        
        const pendingOrders = orders.filter((order: any) => 
          ['运输中', '待取件'].includes(order.status)
        );

        setStats({
          todayOrders: todayOrders.length,
          todayEarnings: completedToday.reduce((sum: number, order: any) => 
            sum + (order.deliveryFee || 15), 0
          ),
          completedOrders: completedToday.length,
          pendingOrders: pendingOrders.length,
          status: pendingOrders.length > 0 ? 'busy' : riderStatus,
        });

        setRiderStatus(pendingOrders.length > 0 ? 'busy' : riderStatus);
      }
    } catch (error) {
      console.error('加载骑手数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleRiderStatus = async () => {
    if (riderStatus === 'busy') {
      Alert.alert('提示', '您有未完成的订单，无法下线');
      return;
    }

    const newStatus = riderStatus === 'online' ? 'offline' : 'online';
    
    try {
      setLoading(true);
      const response = await riderService.updateStatus(user?.id || '', newStatus);
      
      if (response.success) {
        setRiderStatus(newStatus);
        Alert.alert(
          '状态更新成功',
          newStatus === 'online' ? '您已上线，可以接收新订单' : '您已下线'
        );
      } else {
        Alert.alert('状态更新失败', '请稍后重试');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      Alert.alert('状态更新失败', '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return colors.success;
      case 'busy':
        return colors.warning;
      case 'offline':
        return colors.gray;
      default:
        return colors.gray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'busy':
        return '忙碌';
      case 'offline':
        return '离线';
      default:
        return '未知';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRiderData();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 骑手信息卡片 */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.riderInfo}>
              <View>
                <Title style={styles.riderName}>
                  {user?.name} ({user?.username})
                </Title>
                <Text style={styles.riderPhone}>{user?.phone}</Text>
              </View>
              <Chip
                icon="circle"
                style={[styles.statusChip, { backgroundColor: getStatusColor(riderStatus) }]}
                textStyle={{ color: colors.white }}
              >
                {getStatusText(riderStatus)}
              </Chip>
            </View>
            
            <Button
              mode={riderStatus === 'online' ? 'outlined' : 'contained'}
              onPress={toggleRiderStatus}
              style={styles.statusButton}
              loading={loading}
              disabled={loading || riderStatus === 'busy'}
            >
              {riderStatus === 'online' ? '下线' : '上线'}
            </Button>
          </Card.Content>
        </Card>

        {/* 今日统计 */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>今日统计</Title>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.todayOrders}</Text>
                <Text style={styles.statLabel}>接单数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.completedOrders}</Text>
                <Text style={styles.statLabel}>完成数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  ¥{stats.todayEarnings}
                </Text>
                <Text style={styles.statLabel}>收入</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 待处理订单 */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>待处理订单</Title>
              {stats.pendingOrders > 0 && (
                <Badge style={styles.badge}>{stats.pendingOrders}</Badge>
              )}
            </View>
            
            {stats.pendingOrders > 0 ? (
              <Text style={styles.pendingText}>
                您有 {stats.pendingOrders} 个待处理订单，请及时处理
              </Text>
            ) : (
              <Text style={styles.noPendingText}>
                暂无待处理订单
              </Text>
            )}
            
            <Button
              mode="outlined"
              onPress={() => {/* 导航到订单页面 */}}
              style={styles.viewOrdersButton}
            >
              查看订单
            </Button>
          </Card.Content>
        </Card>

        {/* 快捷功能 */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>快捷功能</Title>
            <View style={styles.quickActions}>
              <Button
                mode="contained"
                icon="qr-code-scanner"
                onPress={() => {/* 扫码功能 */}}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                扫码签收
              </Button>
              <Button
                mode="contained"
                icon="map"
                onPress={() => {/* 导航功能 */}}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                导航
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* 紧急联系 FAB */}
      <FAB
        style={styles.fab}
        icon="phone"
        onPress={() => Alert.alert('紧急联系', '400-888-0000')}
        label="客服"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 4,
  },
  riderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  riderPhone: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  statusChip: {
    borderRadius: 20,
  },
  statusButton: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: colors.error,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 16,
    color: colors.warning,
    marginBottom: 16,
  },
  noPendingText: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 16,
  },
  viewOrdersButton: {
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  bottomSpace: {
    height: 80,
  },
});
