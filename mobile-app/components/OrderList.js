import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { orderService, riderService } from '../services/api';

export default function OrderList({ userRole, userData }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      let params = {};
      
      // 根据用户角色加载不同的订单
      if (userRole === 'customer') {
        params.customerId = userData.id;
      } else if (userRole === 'city_rider') {
        params.assignedRider = userData.id;
        params.biz = 'city'; // 骑手只看同城订单
      } else if (userRole === 'city_accountant') {
        params.biz = 'city'; // 只看同城订单
      }
      
      const response = await orderService.getOrders(params);
      
      if (response.success) {
        let orderList = response.data.items || response.data || [];
        
        // 如果是骑手，只显示C开头的同城包裹单号
        if (userRole === 'city_rider') {
          orderList = orderList.filter(order => 
            order.trackingNumber && order.trackingNumber.startsWith('C')
          );
          console.log(`🚴‍♂️ 骑手订单过滤: 总共${response.data.items?.length || 0}个，C开头${orderList.length}个`);
        }
        
        setOrders(orderList);
      } else {
        Alert.alert('加载失败', response.message || '无法获取订单数据');
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      Alert.alert('加载失败', '网络连接失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderAction = async (order, action) => {
    try {
      let response;
      
      if (action === 'pickup' && userRole === 'city_rider') {
        response = await orderService.updateOrder(order.id, {
          status: '运输中',
          pickedUpAt: new Date().toISOString()
        });
        Alert.alert('取件成功', '订单状态已更新为运输中');
      } else if (action === 'deliver' && userRole === 'city_rider') {
        response = await orderService.updateOrder(order.id, {
          status: '已签收',
          completedAt: new Date().toISOString()
        });

        // 完成订单后，通知任务分配系统任务已完成
        if (order.taskId) {
          try {
            await riderService.completeAssignment(order.taskId, userData.username);
            console.log('🎉 任务分配已标记为完成:', order.taskId);
          } catch (error) {
            console.error('更新任务分配状态失败:', error);
          }
        }

        Alert.alert('签收成功', '订单已完成，您的状态将恢复为在线');
      } else if (action === 'pay' && userRole === 'city_accountant') {
        response = await orderService.updateOrder(order.id, {
          status: '已预付'
        });
        Alert.alert('付款确认', '订单已标记为已预付');
      }
      
      if (response && response.success) {
        loadOrders(); // 重新加载订单列表
      }
    } catch (error) {
      console.error('操作失败:', error);
      Alert.alert('操作失败', '请稍后重试');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '待预付':
        return '#ff9800';
      case '已预付':
        return '#4caf50';
      case '待取件':
        return '#2196f3';
      case '运输中':
        return '#ff5722';
      case '已签收':
        return '#4caf50';
      default:
        return '#666';
    }
  };

  const getActionButtons = (order) => {
    const buttons = [];
    
    if (userRole === 'city_rider') {
      if (order.status === '待取件') {
        buttons.push(
          <TouchableOpacity
            key="pickup"
            style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
            onPress={() => handleOrderAction(order, 'pickup')}
          >
            <Text style={styles.actionButtonText}>确认取件</Text>
          </TouchableOpacity>
        );
      } else if (order.status === '运输中') {
        buttons.push(
          <TouchableOpacity
            key="deliver"
            style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
            onPress={() => handleOrderAction(order, 'deliver')}
          >
            <Text style={styles.actionButtonText}>确认签收</Text>
          </TouchableOpacity>
        );
      }
    } else if (userRole === 'city_accountant') {
      if (order.status === '待预付') {
        buttons.push(
          <TouchableOpacity
            key="pay"
            style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
            onPress={() => handleOrderAction(order, 'pay')}
          >
            <Text style={styles.actionButtonText}>确认付款</Text>
          </TouchableOpacity>
        );
      }
    }
    
    return buttons;
  };

  const renderOrderCard = (order, index) => (
    <View key={order.id || index} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.trackingNumber}>
          {order.trackingNumber || `ORDER-${order.id}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>寄件人:</Text>
          <Text style={styles.infoValue}>{order.senderName || '未知'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>收件人:</Text>
          <Text style={styles.infoValue}>{order.receiverName || '未知'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>目的地:</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {order.receiverAddress || order.destination || '未知'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>金额:</Text>
          <Text style={[styles.infoValue, styles.amountText]}>
            ¥{order.totalAmount || order.amount || '0'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>创建时间:</Text>
          <Text style={styles.infoValue}>
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '未知'}
          </Text>
        </View>
      </View>

      {getActionButtons(order).length > 0 && (
        <View style={styles.actionButtons}>
          {getActionButtons(order)}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>加载订单数据...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 订单管理</Text>
        <Text style={styles.headerSubtitle}>
          {userRole === 'customer' && '我的订单'}
          {userRole === 'city_rider' && '分配给我的订单'}
          {userRole === 'city_accountant' && '财务管理订单'}
          {userRole === 'manager' && '所有订单'}
        </Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📭</Text>
          <Text style={styles.emptyTitle}>暂无订单</Text>
          <Text style={styles.emptySubtitle}>下拉刷新或稍后再试</Text>
        </View>
      ) : (
        <>
          <Text style={styles.countText}>共 {orders.length} 个订单</Text>
          {orders.map(renderOrderCard)}
        </>
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  countText: {
    padding: 15,
    fontSize: 14,
    color: '#666',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  amountText: {
    fontWeight: 'bold',
    color: '#4caf50',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  bottomSpace: {
    height: 20,
  },
});
