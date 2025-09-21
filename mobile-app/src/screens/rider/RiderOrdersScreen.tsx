import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  Divider,
  FAB,
  SearchBar,
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { riderService } from '../../services/api';
import { colors } from '../../theme/theme';

interface Order {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  itemDescription: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  assignedAt?: string;
  urgentDelivery?: boolean;
}

export default function RiderOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await riderService.getOrders(user?.id || '');
      
      if (response.success) {
        setOrders(response.data.items || []);
      } else {
        Alert.alert('加载失败', '无法获取订单信息');
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      Alert.alert('加载失败', '网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // 按状态筛选
    if (filter === 'pending') {
      filtered = orders.filter(order => 
        ['待取件', '运输中'].includes(order.status)
      );
    } else if (filter === 'completed') {
      filtered = orders.filter(order => 
        order.status === '已签收'
      );
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      filtered = filtered.filter(order =>
        order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.receiverPhone.includes(searchQuery)
      );
    }

    setFilteredOrders(filtered);
  };

  const handlePickupOrder = async (order: Order) => {
    Alert.alert(
      '确认取件',
      `确认已从 ${order.senderName} 处取件？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              const response = await riderService.updateOrderStatus(order.id, '运输中');
              if (response.success) {
                Alert.alert('取件成功', '订单状态已更新为运输中');
                loadOrders();
              } else {
                Alert.alert('操作失败', '请稍后重试');
              }
            } catch (error) {
              Alert.alert('操作失败', '网络错误，请稍后重试');
            }
          }
        }
      ]
    );
  };

  const handleCompleteOrder = async (order: Order) => {
    Alert.alert(
      '确认签收',
      `确认 ${order.receiverName} 已签收？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              const response = await riderService.completeOrder(order.id, user?.id || '');
              if (response.success) {
                Alert.alert('签收成功', '订单已完成，收入已结算');
                loadOrders();
              } else {
                Alert.alert('操作失败', '请稍后重试');
              }
            } catch (error) {
              Alert.alert('操作失败', '网络错误，请稍后重试');
            }
          }
        }
      ]
    );
  };

  const makePhoneCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件':
        return colors.warning;
      case '运输中':
        return colors.info;
      case '已签收':
        return colors.success;
      default:
        return colors.gray;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrderCard = (order: Order) => (
    <Card key={order.id} style={styles.orderCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}
            textStyle={{ color: colors.white, fontSize: 12 }}
          >
            {order.status}
          </Chip>
        </View>

        {order.urgentDelivery && (
          <Chip
            icon="flash"
            style={styles.urgentChip}
            textStyle={{ color: colors.white }}
          >
            加急
          </Chip>
        )}

        <Divider style={styles.divider} />

        {/* 寄件信息 */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>📦 取件地址</Text>
          <Text style={styles.personName}>{order.senderName}</Text>
          <Text style={styles.phone}>{order.senderPhone}</Text>
          <Text style={styles.address}>{order.senderAddress}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* 收件信息 */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>📍 送达地址</Text>
          <Text style={styles.personName}>{order.receiverName}</Text>
          <Text style={styles.phone}>{order.receiverPhone}</Text>
          <Text style={styles.address}>{order.receiverAddress}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* 物品信息 */}
        <View style={styles.itemSection}>
          <Text style={styles.sectionTitle}>📋 物品信息</Text>
          <Text style={styles.itemDescription}>{order.itemDescription}</Text>
          <Text style={styles.amount}>配送费: ¥{order.totalAmount || 15}</Text>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          {order.status === '待取件' && (
            <>
              <Button
                mode="outlined"
                icon="phone"
                onPress={() => makePhoneCall(order.senderPhone)}
                style={styles.actionButton}
                compact
              >
                联系寄件人
              </Button>
              <Button
                mode="contained"
                icon="package-variant"
                onPress={() => handlePickupOrder(order)}
                style={styles.actionButton}
                compact
              >
                确认取件
              </Button>
            </>
          )}

          {order.status === '运输中' && (
            <>
              <Button
                mode="outlined"
                icon="phone"
                onPress={() => makePhoneCall(order.receiverPhone)}
                style={styles.actionButton}
                compact
              >
                联系收件人
              </Button>
              <Button
                mode="outlined"
                icon="map"
                onPress={() => openNavigation(order.receiverAddress)}
                style={styles.actionButton}
                compact
              >
                导航
              </Button>
              <Button
                mode="contained"
                icon="check-circle"
                onPress={() => handleCompleteOrder(order)}
                style={styles.actionButton}
                compact
              >
                确认签收
              </Button>
            </>
          )}

          {order.status === '已签收' && (
            <Text style={styles.completedText}>
              ✅ 已完成 - {new Date(order.assignedAt || '').toLocaleDateString()}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <SearchBar
        placeholder="搜索运单号、收件人..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* 筛选按钮 */}
      <View style={styles.filterContainer}>
        <Button
          mode={filter === 'pending' ? 'contained' : 'outlined'}
          onPress={() => setFilter('pending')}
          style={styles.filterButton}
          compact
        >
          待处理 ({orders.filter(o => ['待取件', '运输中'].includes(o.status)).length})
        </Button>
        <Button
          mode={filter === 'completed' ? 'contained' : 'outlined'}
          onPress={() => setFilter('completed')}
          style={styles.filterButton}
          compact
        >
          已完成 ({orders.filter(o => o.status === '已签收').length})
        </Button>
        <Button
          mode={filter === 'all' ? 'contained' : 'outlined'}
          onPress={() => setFilter('all')}
          style={styles.filterButton}
          compact
        >
          全部 ({orders.length})
        </Button>
      </View>

      {/* 订单列表 */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>暂无订单</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
        
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* 扫码签收 FAB */}
      <FAB
        style={styles.fab}
        icon="qr-code-scanner"
        onPress={() => {/* 扫码功能 */}}
        label="扫码"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  ordersList: {
    flex: 1,
  },
  orderCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusChip: {
    borderRadius: 12,
  },
  urgentChip: {
    backgroundColor: colors.error,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  addressSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  phone: {
    fontSize: 14,
    color: colors.info,
    marginTop: 2,
  },
  address: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
    lineHeight: 20,
  },
  itemSection: {
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.dark,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  completedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.gray,
    padding: 20,
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
