import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { packageService, Package } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

export default function DeliveryHistoryScreen({ navigation }: any) {
  const { language } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalStats, setTotalStats] = useState({ deliveryFee: 0, cod: 0 });
  const [showCODModal, setShowCODModal] = useState(false);
  const [lastSettledDate, setLastSettledDate] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
      const history = allPackages.filter(pkg => 
        pkg.courier === currentUser && 
        ['已送达', '已取消'].includes(pkg.status)
      );
      
      setPackages(history);

      let deliveryFee = 0;
      let cod = 0;
      history.forEach(pkg => {
        if (pkg.status === '已送达' && !pkg.rider_settled) {
          const priceVal = parseFloat(pkg.price?.toString().replace(/[^\d.]/g, '') || '0');
          deliveryFee += priceVal;
          cod += Number(pkg.cod_amount || 0);
        }
      });
      setTotalStats({ deliveryFee, cod });

      const settledPackages = allPackages.filter(pkg => 
        pkg.courier === currentUser && pkg.rider_settled && pkg.rider_settled_at
      );
      if (settledPackages.length > 0) {
        settledPackages.sort((a, b) => new Date(b.rider_settled_at!).getTime() - new Date(a.rider_settled_at!).getTime());
        setLastSettledDate(settledPackages[0].rider_settled_at || null);
      } else {
        setLastSettledDate(null);
      }

    } catch (error) {
      console.error('加载历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '已送达':
        return language === 'zh' ? '已送达' : language === 'en' ? 'Delivered' : 'ပေးပို့ပြီး';
      case '已取消':
        return language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး';
      default:
        return status;
    }
  };

  const filteredPackages = packages.filter(pkg => {
    if (!searchQuery.trim()) return true;
    return pkg.id.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.cardWrapper}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.glassCard}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.packageId}>{item.id}</Text>
            <Text style={styles.dateText}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" /> {item.status === '已送达' ? item.delivery_time : item.create_time}
            </Text>
          </View>
          
          {item.status === '已取消' ? (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Text style={[styles.statusText, { color: '#f87171' }]}>{getStatusText(item.status)}</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { 
              backgroundColor: item.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderColor: item.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'
            }]}>
              <Text style={[styles.statusText, { color: item.payment_method === 'qr' ? '#60a5fa' : '#fbbf24' }]}>
                {item.payment_method === 'qr' ? '📱 QR' : '💵 CASH'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.receiverName}>{item.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.addressText} numberOfLines={1}>{item.receiver_address}</Text>
          </View>
        </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.priceText}>{Number(parseFloat(String(item.price || 0).replace(/[^\d.]/g, '')) || 0).toLocaleString()} MMK</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const completedCount = packages.filter(p => p.status === '已送达').length;
  const cancelledCount = packages.filter(p => p.status === '已取消').length;
  const totalDistance = packages.reduce((sum, pkg) => sum + (pkg.delivery_distance || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'zh' ? '配送历史' : 'Delivery History'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 顶部统计卡片 */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>{language === 'zh' ? '已完成' : 'Completed'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totalDistance.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>{language === 'zh' ? '总里程' : 'Distance'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{packages.length}</Text>
            <Text style={styles.summaryLabel}>{language === 'zh' ? '总计' : 'Total'}</Text>
          </View>
        </View>

        {/* 金额概览 */}
        <View style={styles.statsContainer}>
          <LinearGradient colors={['rgba(59, 130, 246, 0.25)', 'rgba(37, 99, 235, 0.1)']} style={styles.statsCard}>
            <Text style={styles.statsLabel}>{language === 'zh' ? '本期配送费' : 'Period Fees'}</Text>
            <Text style={[styles.statsValue, { color: '#60a5fa' }]}>{totalStats.deliveryFee.toLocaleString()}</Text>
            <Text style={styles.statsUnit}>MMK</Text>
          </LinearGradient>

          <TouchableOpacity 
            style={styles.statsCardWrapper}
            onPress={() => setShowCODModal(true)}
          >
            <LinearGradient colors={['rgba(245, 158, 11, 0.25)', 'rgba(217, 119, 6, 0.1)']} style={styles.statsCard}>
              <Text style={styles.statsLabel}>{language === 'zh' ? '本期代收款' : 'Period COD'}</Text>
              <Text style={[styles.statsValue, { color: '#fbbf24' }]}>{totalStats.cod.toLocaleString()}</Text>
              <Text style={styles.statsUnit}>MMK</Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(245, 158, 11, 0.5)" style={styles.statsIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {lastSettledDate && (
          <View style={styles.settleInfo}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.settleText}>
              {language === 'zh' ? '上次结清: ' : 'Last Settled: '}
              {new Date(lastSettledDate).toLocaleString()}
            </Text>
          </View>
        )}

        {/* 搜索框 */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchInner}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.searchInput}
              placeholder={language === 'zh' ? '搜索单号...' : 'Search ID...'}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* 列表 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : filteredPackages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyText}>
              {language === 'zh' ? '暂无记录' : 'No Records'}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {filteredPackages.map((item) => (
              <React.Fragment key={item.id}>
                {renderPackageItem({ item })}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* COD 详情 Modal */}
      <Modal
        visible={showCODModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCODModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'zh' ? '代收款明细' : 'COD Breakdown'}</Text>
              <TouchableOpacity onPress={() => setShowCODModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {packages.filter(p => (p.cod_amount || 0) > 0 && p.status === '已送达' && !p.rider_settled).length > 0 ? (
                packages
                  .filter(p => (p.cod_amount || 0) > 0 && p.status === '已送达' && !p.rider_settled)
                  .map((pkg, index) => (
                    <View key={index} style={styles.codItem}>
                      <View>
                        <Text style={styles.codOrderId}>{pkg.id}</Text>
                        <Text style={styles.codTime}>{pkg.delivery_time}</Text>
                      </View>
                      <Text style={styles.codAmount}>{Number(pkg.cod_amount).toLocaleString()} MMK</Text>
                    </View>
                  ))
              ) : (
                <View style={styles.modalEmpty}>
                  <Text style={styles.emptyText}>{language === 'zh' ? '暂无未结清记录' : 'No Unsettled Records'}</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCODModal(false)}>
              <Text style={styles.modalCloseBtnText}>{language === 'zh' ? '确定' : 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  summaryBar: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statsCardWrapper: {
    flex: 1,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statsUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
    marginTop: 2,
  },
  statsIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  settleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  settleText: {
    fontSize: 11,
    color: 'rgba(16, 185, 129, 0.8)',
    fontWeight: '700',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  glassCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    gap: 4,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiverName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glassModal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalScroll: {
    marginBottom: 20,
  },
  codItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  codOrderId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  codTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  codAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fbbf24',
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
