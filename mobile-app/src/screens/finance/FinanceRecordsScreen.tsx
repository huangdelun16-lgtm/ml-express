import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  SearchBar,
  FAB,
  Menu,
  Divider,
} from 'react-native-paper';
import { financeService } from '../../services/api';
import { colors } from '../../theme/theme';

interface FinanceRecord {
  id: string;
  trackingNumber: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  businessType: string;
}

export default function FinanceRecordsScreen() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, statusFilter]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await financeService.getFinanceRecords();
      
      if (response.success) {
        setRecords(response.data || []);
      } else {
        Alert.alert('加载失败', '无法获取财务记录');
      }
    } catch (error) {
      console.error('加载财务记录失败:', error);
      Alert.alert('加载失败', '网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // 按状态筛选
    if (statusFilter !== 'all') {
      filtered = records.filter(record => record.status === statusFilter);
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      filtered = filtered.filter(record =>
        record.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  const updateRecordStatus = async (record: FinanceRecord, newStatus: string) => {
    try {
      const response = await financeService.updateFinanceStatus(record.id, newStatus);
      
      if (response.success) {
        Alert.alert('更新成功', `订单 ${record.trackingNumber} 状态已更新`);
        loadRecords();
      } else {
        Alert.alert('更新失败', '请稍后重试');
      }
    } catch (error) {
      Alert.alert('更新失败', '网络错误，请稍后重试');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待付费':
        return colors.error;
      case '已预付':
        return colors.success;
      case '待签收':
        return colors.warning;
      case '已完成':
        return colors.success;
      default:
        return colors.gray;
    }
  };

  const getStatusActions = (record: FinanceRecord) => {
    const actions = [];
    
    if (record.status === '待付费') {
      actions.push({
        title: '标记为已预付',
        onPress: () => updateRecordStatus(record, '已预付')
      });
    }
    
    if (record.status === '待签收') {
      actions.push({
        title: '标记为已完成',
        onPress: () => updateRecordStatus(record, '已完成')
      });
    }

    return actions;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const renderRecordCard = (record: FinanceRecord) => (
    <Card key={record.id} style={styles.recordCard}>
      <Card.Content>
        <View style={styles.recordHeader}>
          <Text style={styles.trackingNumber}>{record.trackingNumber}</Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(record.status) }]}
            textStyle={{ color: colors.white, fontSize: 12 }}
          >
            {record.status}
          </Chip>
        </View>

        <View style={styles.recordInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>客户:</Text>
            <Text style={styles.infoValue}>{record.customerName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>金额:</Text>
            <Text style={[styles.infoValue, styles.amountText]}>¥{record.amount}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>支付方式:</Text>
            <Text style={styles.infoValue}>{record.paymentMethod}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>业务类型:</Text>
            <Text style={styles.infoValue}>
              {record.businessType === 'city' ? '同城快递' : '跨境物流'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>创建时间:</Text>
            <Text style={styles.infoValue}>
              {new Date(record.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {getStatusActions(record).length > 0 && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.actionButtons}>
              {getStatusActions(record).map((action, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  onPress={action.onPress}
                  style={styles.actionButton}
                  compact
                >
                  {action.title}
                </Button>
              ))}
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <SearchBar
        placeholder="搜索运单号、客户..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* 筛选按钮 */}
      <ScrollView horizontal style={styles.filterContainer} showsHorizontalScrollIndicator={false}>
        <Button
          mode={statusFilter === 'all' ? 'contained' : 'outlined'}
          onPress={() => setStatusFilter('all')}
          style={styles.filterButton}
          compact
        >
          全部 ({records.length})
        </Button>
        <Button
          mode={statusFilter === '待付费' ? 'contained' : 'outlined'}
          onPress={() => setStatusFilter('待付费')}
          style={styles.filterButton}
          compact
        >
          待付费 ({records.filter(r => r.status === '待付费').length})
        </Button>
        <Button
          mode={statusFilter === '已预付' ? 'contained' : 'outlined'}
          onPress={() => setStatusFilter('已预付')}
          style={styles.filterButton}
          compact
        >
          已预付 ({records.filter(r => r.status === '已预付').length})
        </Button>
        <Button
          mode={statusFilter === '已完成' ? 'contained' : 'outlined'}
          onPress={() => setStatusFilter('已完成')}
          style={styles.filterButton}
          compact
        >
          已完成 ({records.filter(r => r.status === '已完成').length})
        </Button>
      </ScrollView>

      {/* 记录列表 */}
      <ScrollView
        style={styles.recordsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRecords.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>暂无财务记录</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredRecords.map(renderRecordCard)
        )}
        
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* 刷新 FAB */}
      <FAB
        style={styles.fab}
        icon="refresh"
        onPress={loadRecords}
        label="刷新"
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
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    marginRight: 8,
  },
  recordsList: {
    flex: 1,
  },
  recordCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 4,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusChip: {
    borderRadius: 12,
  },
  recordInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: colors.dark,
    flex: 1,
  },
  amountText: {
    fontWeight: 'bold',
    color: colors.success,
  },
  divider: {
    marginVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
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
