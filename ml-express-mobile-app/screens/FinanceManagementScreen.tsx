import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
  type DimensionValue,
} from 'react-native';
import { supabase, auditLogService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { formatI18n } from '../utils/i18n';

const { width } = Dimensions.get('window');

interface FinanceRecord {
  id: string;
  record_type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  status: string;
  record_date: string;
  notes?: string;
}

export default function FinanceManagementScreen({ navigation }: any) {
  const { t } = useApp();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  // 标签页和模态框状态
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'analytics' | 'reports'>('overview');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // 新增/编辑记录表单
  const [recordForm, setRecordForm] = useState({
    record_type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    currency: 'MMK',
    status: 'completed' as 'completed' | 'pending' | 'cancelled',
    record_date: new Date().toISOString().slice(0, 10),
    notes: '',
    order_id: '',
    courier_id: '',
    payment_method: 'cash',
    reference: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finances')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(100);

      if (!error && data) {
        setRecords(data);
      }
    } catch (error) {
      console.error('加载财务记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  // 计算财务统计
  const calculateFinanceStats = () => {
    const today = new Date().toLocaleDateString('zh-CN');
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    // 总统计
    const totalIncome = records
      .filter(r => r.record_type === 'income' && r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalExpense = records
      .filter(r => r.record_type === 'expense' && r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0);
    
    // 本月统计
    const monthlyIncome = records
      .filter(r => r.record_type === 'income' && r.status === 'completed' && r.record_date.startsWith(thisMonth))
      .reduce((sum, r) => sum + r.amount, 0);
    
    const monthlyExpense = records
      .filter(r => r.record_type === 'expense' && r.status === 'completed' && r.record_date.startsWith(thisMonth))
      .reduce((sum, r) => sum + r.amount, 0);
    
    // 今日统计
    const todayIncome = records
      .filter(r => r.record_type === 'income' && r.status === 'completed' && r.record_date === today)
      .reduce((sum, r) => sum + r.amount, 0);
    
    const todayExpense = records
      .filter(r => r.record_type === 'expense' && r.status === 'completed' && r.record_date === today)
      .reduce((sum, r) => sum + r.amount, 0);

    // 待处理统计
    const pendingAmount = records
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      total: { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense },
      monthly: { income: monthlyIncome, expense: monthlyExpense, profit: monthlyIncome - monthlyExpense },
      today: { income: todayIncome, expense: todayExpense, profit: todayIncome - todayExpense },
      pending: pendingAmount,
      recordCount: records.length,
    };
  };

  const stats = calculateFinanceStats();

  // 记录管理函数
  const handleAddRecord = async () => {
    if (!recordForm.category || !recordForm.amount) {
      Alert.alert(t.tipTitle, t.financeFillCategoryAndAmount);
      return;
    }

    try {
      const newRecord = {
        id: `FIN${Date.now()}`,
        ...recordForm,
        amount: Number(recordForm.amount),
      };

      const { error } = await supabase
        .from('finances')
        .insert([newRecord]);

      if (error) {
        Alert.alert(t.error, t.financeAddFailed);
        return;
      }

      // 记录审计日志
      const currentUser = await AsyncStorage.getItem('currentUser') || 'unknown';
      const currentUserName = await AsyncStorage.getItem('currentUserName') || '未知用户';
      
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'create',
        module: 'finance',
        target_id: newRecord.id,
        target_name: `财务记录 ${newRecord.id}`,
        action_description: `移动端创建财务记录，类型：${newRecord.record_type === 'income' ? '收入' : '支出'}，分类：${newRecord.category}，金额：${newRecord.amount} ${newRecord.currency}`,
      });

      Alert.alert(t.success, t.financeAddSuccess);
      setShowAddRecord(false);
      resetForm();
      await loadRecords();
    } catch (error) {
      Alert.alert(t.error, t.financeAddFailed);
    }
  };

  const handleDeleteRecord = async (record: FinanceRecord) => {
    Alert.alert(
      t.financeConfirmDeleteTitle,
      formatI18n(t.financeConfirmDeleteBody, {
        category: record.category,
        amount: String(record.amount),
        currency: record.currency,
      }),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('finances')
                .delete()
                .eq('id', record.id);

              if (error) {
                Alert.alert(t.error, t.financeDeleteFailed);
                return;
              }

              // 记录审计日志
              const currentUser = await AsyncStorage.getItem('currentUser') || 'unknown';
              const currentUserName = await AsyncStorage.getItem('currentUserName') || '未知用户';
              
              await auditLogService.log({
                user_id: currentUser,
                user_name: currentUserName,
                action_type: 'delete',
                module: 'finance',
                target_id: record.id,
                target_name: `财务记录 ${record.id}`,
                action_description: `移动端删除财务记录，类型：${record.record_type === 'income' ? '收入' : '支出'}，分类：${record.category}，金额：${record.amount} ${record.currency}`,
              });

              Alert.alert(t.success, t.financeRecordDeleted);
              await loadRecords();
            } catch (error) {
              Alert.alert(t.error, t.financeDeleteFailed);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setRecordForm({
      record_type: 'income',
      category: '',
      amount: '',
      currency: 'MMK',
      status: 'completed',
      record_date: new Date().toISOString().slice(0, 10),
      notes: '',
      order_id: '',
      courier_id: '',
      payment_method: 'cash',
      reference: '',
    });
  };

  // 批量操作函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedRecords(new Set());
  };

  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const batchDeleteRecords = async () => {
    if (selectedRecords.size === 0) return;

    Alert.alert(
      t.financeConfirmBatchDelete,
      formatI18n(t.financeBatchDeleteConfirm, { count: selectedRecords.size }),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const recordIds = Array.from(selectedRecords);
              const { error } = await supabase
                .from('finances')
                .delete()
                .in('id', recordIds);

              if (error) {
                Alert.alert(t.error, t.financeBatchDeleteFailed);
                return;
              }

              Alert.alert(t.success, formatI18n(t.financeBatchDeleteSuccess, { count: recordIds.length }));
              setSelectedRecords(new Set());
              setBatchMode(false);
              await loadRecords();
            } catch (error) {
              Alert.alert(t.error, t.financeBatchDeleteFailed);
            }
          }
        }
      ]
    );
  };

  // 筛选和搜索
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.category.toLowerCase().includes(searchText.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchText.toLowerCase()) ||
      r.id.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' || r.record_type === filter;
    
    return matchesSearch && matchesFilter;
  });

  const renderRecordItem = ({ item }: { item: FinanceRecord }) => {
    const isSelected = selectedRecords.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.recordCard, isSelected && styles.recordCardSelected]}
        activeOpacity={0.7}
        onPress={() => {
          if (batchMode) {
            toggleRecordSelection(item.id);
          } else {
            setSelectedRecord(item);
            setShowEditRecord(true);
          }
        }}
        onLongPress={() => {
          if (!batchMode) {
            Alert.alert(
              t.financeActionOptions,
              formatI18n(t.financeChooseActionFor, { category: item.category }),
              [
                { text: t.cancel, style: 'cancel' },
                { text: t.edit, onPress: () => {
                  setSelectedRecord(item);
                  setRecordForm({
                    record_type: item.record_type,
                    category: item.category,
                    amount: item.amount.toString(),
                    currency: item.currency,
                    status: item.status as any,
                    record_date: item.record_date,
                    notes: item.notes || '',
                    order_id: '',
                    courier_id: '',
                    payment_method: 'cash',
                    reference: '',
                  });
                  setShowEditRecord(true);
                }},
                { text: t.delete, style: 'destructive', onPress: () => handleDeleteRecord(item) }
              ]
            );
          }
        }}
      >
        {/* 批量选择复选框 */}
        {batchMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}

        {/* 左侧彩色指示条 */}
        <View style={[styles.colorIndicator, {
          backgroundColor: item.record_type === 'income' ? '#27ae60' : '#e74c3c'
        }]} />

        {/* 类型图标 */}
        <View style={[styles.typeIcon, {
          backgroundColor: item.record_type === 'income' ? '#d4edda' : '#f8d7da'
        }]}>
          <Text style={styles.typeEmoji}>
            {item.record_type === 'income' ? '💰' : '💸'}
          </Text>
        </View>

        {/* 信息 */}
        <View style={styles.recordInfo}>
          <View style={styles.recordHeader}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={[styles.amount, {
              color: item.record_type === 'income' ? '#27ae60' : '#e74c3c'
            }]}>
              {item.record_type === 'income' ? '+' : '-'} {item.amount.toLocaleString()} {item.currency}
            </Text>
          </View>

          <Text style={styles.recordDate}>📅 {item.record_date}</Text>
          
          {item.notes && (
            <Text style={styles.notes} numberOfLines={1}>💬 {item.notes}</Text>
          )}

          <View style={[styles.statusTag, {
            backgroundColor: 
              item.status === 'completed' ? '#d4edda' : 
              item.status === 'pending' ? '#fff3cd' : '#f8d7da'
          }]}>
            <Text style={[styles.statusTagText, {
              color: 
                item.status === 'completed' ? '#27ae60' : 
                item.status === 'pending' ? '#f39c12' : '#e74c3c'
            }]}>
              {item.status === 'completed' 
                ? t.financeStatusCompleted
                : item.status === 'pending' 
                ? t.financeStatusPending
                : t.financeStatusCancelled
              }
            </Text>
          </View>
        </View>

        {/* 快捷操作按钮 */}
        {!batchMode && (
          <TouchableOpacity
            style={styles.quickDeleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteRecord(item);
            }}
          >
            <Text style={styles.quickDeleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 {t.financeManagementTitle}</Text>
        <TouchableOpacity onPress={() => setShowAddRecord(true)} style={styles.addButton}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 标签页导航 */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: t.financeTabOverview, icon: '📊' },
          { key: 'records', label: t.financeTabRecords, icon: '📋' },
          { key: 'analytics', label: t.financeTabAnalytics, icon: '📈' },
          { key: 'reports', label: t.financeTabReports, icon: '📄' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 内容区域 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>{t.financeLoadingData}</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'records' && renderRecordsTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'reports' && renderReportsTab()}
        </>
      )}

      {/* 新增记录模态框 */}
      <Modal
        visible={showAddRecord}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddRecord(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.largeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ {t.financeAddRecordTitle}</Text>
              <TouchableOpacity onPress={() => setShowAddRecord(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* 收入/支出选择 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>记录类型 *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeSelectorButton, recordForm.record_type === 'income' && styles.selectedTypeButton]}
                    onPress={() => setRecordForm({...recordForm, record_type: 'income'})}
                  >
                    <Text style={styles.typeSelectorIcon}>💰</Text>
                    <Text style={[styles.typeSelectorText, recordForm.record_type === 'income' && styles.selectedTypeText]}>
                      收入
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeSelectorButton, recordForm.record_type === 'expense' && styles.selectedTypeButton]}
                    onPress={() => setRecordForm({...recordForm, record_type: 'expense'})}
                  >
                    <Text style={styles.typeSelectorIcon}>💸</Text>
                    <Text style={[styles.typeSelectorText, recordForm.record_type === 'expense' && styles.selectedTypeText]}>
                      支出
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 分类选择 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>分类 *</Text>
                <View style={styles.categoryGrid}>
                  {(recordForm.record_type === 'income' 
                    ? ['同城配送', '次日配送', '其他收入']
                    : ['快递员佣金', '员工工资', '运营支出', '车辆维护', '营销推广', '其他支出']
                  ).map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryButton, recordForm.category === cat && styles.selectedCategoryButton]}
                      onPress={() => setRecordForm({...recordForm, category: cat})}
                    >
                      <Text style={[styles.categoryButtonText, recordForm.category === cat && styles.selectedCategoryText]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 金额 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>金额 * (MMK)</Text>
                <TextInput
                  style={styles.textInput}
                  value={recordForm.amount}
                  onChangeText={(text) => setRecordForm({...recordForm, amount: text})}
                  placeholder="请输入金额"
                  keyboardType="numeric"
                />
              </View>

              {/* 日期 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>日期 *</Text>
                <TextInput
                  style={styles.textInput}
                  value={recordForm.record_date}
                  onChangeText={(text) => setRecordForm({...recordForm, record_date: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* 备注 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>备注</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={recordForm.notes}
                  onChangeText={(text) => setRecordForm({...recordForm, notes: text})}
                  placeholder="可选备注信息..."
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* 按钮 */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setShowAddRecord(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddRecord}>
                  <Text style={styles.submitButtonText}>💾 保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  // 标签页渲染函数
  function renderOverviewTab() {
    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 核心财务统计 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 财务概览</Text>
          
          {/* 主要统计卡片 */}
          <View style={styles.mainStatsGrid}>
            <View style={[styles.mainStatCard, { backgroundColor: '#27ae60' }]}>
              <Text style={styles.mainStatIcon}>💰</Text>
              <Text style={styles.mainStatNumber}>{stats.total.income.toLocaleString()}</Text>
              <Text style={styles.mainStatLabel}>总收入 (MMK)</Text>
            </View>
            <View style={[styles.mainStatCard, { backgroundColor: '#e74c3c' }]}>
              <Text style={styles.mainStatIcon}>💸</Text>
              <Text style={styles.mainStatNumber}>{stats.total.expense.toLocaleString()}</Text>
              <Text style={styles.mainStatLabel}>总支出 (MMK)</Text>
            </View>
          </View>

          {/* 净利润卡片 */}
          <View style={[styles.profitCard, {
            backgroundColor: stats.total.profit >= 0 ? '#d4edda' : '#f8d7da'
          }]}>
            <Text style={styles.profitIcon}>
              {stats.total.profit >= 0 ? '📈' : '📉'}
            </Text>
            <View style={styles.profitInfo}>
              <Text style={styles.profitLabel}>净利润</Text>
              <Text style={[styles.profitAmount, {
                color: stats.total.profit >= 0 ? '#27ae60' : '#e74c3c'
              }]}>
                {stats.total.profit >= 0 ? '+' : ''}{stats.total.profit.toLocaleString()} MMK
              </Text>
            </View>
          </View>
        </View>

        {/* 时间段统计 */}
        <View style={styles.periodSection}>
          <Text style={styles.sectionTitle}>📅 时间段分析</Text>
          
          <View style={styles.periodStatsContainer}>
            <View style={styles.periodStatCard}>
              <Text style={styles.periodStatTitle}>今日</Text>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>收入:</Text>
                <Text style={[styles.periodStatValue, { color: '#27ae60' }]}>
                  +{stats.today.income.toLocaleString()}
                </Text>
              </View>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>支出:</Text>
                <Text style={[styles.periodStatValue, { color: '#e74c3c' }]}>
                  -{stats.today.expense.toLocaleString()}
                </Text>
              </View>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>净额:</Text>
                <Text style={[styles.periodStatValue, {
                  color: stats.today.profit >= 0 ? '#2c5282' : '#e74c3c'
                }]}>
                  {stats.today.profit >= 0 ? '+' : ''}{stats.today.profit.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.periodStatCard}>
              <Text style={styles.periodStatTitle}>本月</Text>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>收入:</Text>
                <Text style={[styles.periodStatValue, { color: '#27ae60' }]}>
                  +{stats.monthly.income.toLocaleString()}
                </Text>
              </View>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>支出:</Text>
                <Text style={[styles.periodStatValue, { color: '#e74c3c' }]}>
                  -{stats.monthly.expense.toLocaleString()}
                </Text>
              </View>
              <View style={styles.periodStatRow}>
                <Text style={styles.periodStatLabel}>净额:</Text>
                <Text style={[styles.periodStatValue, {
                  color: stats.monthly.profit >= 0 ? '#2c5282' : '#e74c3c'
                }]}>
                  {stats.monthly.profit >= 0 ? '+' : ''}{stats.monthly.profit.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 待处理事项 */}
        {stats.pending > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>⏳ 待处理事项</Text>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingIcon}>⚠️</Text>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>有待处理的财务记录</Text>
                <Text style={styles.pendingAmount}>
                  总金额: {stats.pending.toLocaleString()} MMK
                </Text>
                <Text style={styles.pendingCount}>
                  {records.filter(r => r.status === 'pending').length} 条记录需要处理
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 最近记录 */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>🕒 最近记录</Text>
          {records.slice(0, 5).map(record => (
            <TouchableOpacity
              key={record.id}
              style={styles.recentRecordItem}
              onPress={() => {
                setSelectedRecord(record);
                setShowEditRecord(true);
              }}
            >
              <View style={styles.recentRecordInfo}>
                <Text style={styles.recentRecordCategory}>{record.category}</Text>
                <Text style={styles.recentRecordDate}>{record.record_date}</Text>
              </View>
              <Text style={[styles.recentRecordAmount, {
                color: record.record_type === 'income' ? '#27ae60' : '#e74c3c'
              }]}>
                {record.record_type === 'income' ? '+' : '-'}{record.amount.toLocaleString()} {record.currency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderRecordsTab() {
    return (
      <View style={styles.recordsTabContainer}>
        {/* 搜索栏 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索记录..."
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 筛选和批量操作 */}
        <View style={styles.controlsBar}>
          {!batchMode ? (
            <>
              <View style={styles.filterSection}>
                {['all', 'income', 'expense'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                    onPress={() => setFilter(f as any)}
                  >
                    <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                      {f === 'all' ? '全部' : f === 'income' ? '收入' : '支出'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.batchButton} onPress={toggleBatchMode}>
                <Text style={styles.batchButtonText}>批量</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.batchControls}>
              <Text style={styles.selectedCount}>已选择 {selectedRecords.size} 条</Text>
              <View style={styles.batchActions}>
                {selectedRecords.size > 0 && (
                  <TouchableOpacity style={styles.batchDeleteButton} onPress={batchDeleteRecords}>
                    <Text style={styles.batchDeleteText}>🗑️ 删除</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelBatchButton} onPress={toggleBatchMode}>
                  <Text style={styles.cancelBatchText}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 记录列表 */}
        <FlatList
          data={filteredRecords}
          renderItem={renderRecordItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyText}>
                {searchText ? '没有找到匹配的记录' : '暂无财务记录'}
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  function renderAnalyticsTab() {
    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 收支趋势分析 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>📈 收支趋势分析</Text>
          <View style={styles.trendChart}>
            <Text style={styles.chartPlaceholder}>📊 收支趋势图表</Text>
            <Text style={styles.chartSubText}>（可集成图表组件显示月度趋势）</Text>
          </View>
        </View>

        {/* 分类分析 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>🏷️ 支出分类分析</Text>
          {['快递员佣金', '员工工资', '运营支出', '车辆维护', '营销推广'].map(category => {
            const categoryAmount = records
              .filter(r => r.record_type === 'expense' && r.category === category && r.status === 'completed')
              .reduce((sum, r) => sum + r.amount, 0);
            const percentage = stats.total.expense > 0 ? (categoryAmount / stats.total.expense * 100).toFixed(1) : '0.0';
            
            return (
              <View key={category} style={styles.categoryAnalysisItem}>
                <View style={styles.categoryAnalysisInfo}>
                  <Text style={styles.categoryAnalysisName}>{category}</Text>
                  <Text style={styles.categoryAnalysisAmount}>
                    {categoryAmount.toLocaleString()} MMK ({percentage}%)
                  </Text>
                </View>
                <View style={styles.categoryProgressBar}>
                  <View 
                    style={[styles.categoryProgressFill, { width: `${percentage}%` as DimensionValue }]} 
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* 效率分析 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>⚡ 财务效率分析</Text>
          
          <View style={styles.efficiencyMetrics}>
            <View style={styles.efficiencyItem}>
              <Text style={styles.efficiencyIcon}>📊</Text>
              <Text style={styles.efficiencyLabel}>平均日收入</Text>
              <Text style={styles.efficiencyValue}>
                {Math.round(stats.total.income / 30).toLocaleString()} MMK
              </Text>
            </View>
            
            <View style={styles.efficiencyItem}>
              <Text style={styles.efficiencyIcon}>💎</Text>
              <Text style={styles.efficiencyLabel}>利润率</Text>
              <Text style={[styles.efficiencyValue, {
                color: stats.total.profit >= 0 ? '#27ae60' : '#e74c3c'
              }]}>
                {stats.total.income > 0 ? 
                  ((stats.total.profit / stats.total.income) * 100).toFixed(1) : '0.0'
                }%
              </Text>
            </View>
            
            <View style={styles.efficiencyItem}>
              <Text style={styles.efficiencyIcon}>📋</Text>
              <Text style={styles.efficiencyLabel}>记录总数</Text>
              <Text style={styles.efficiencyValue}>{stats.recordCount}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderReportsTab() {
    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 报表生成 */}
        <View style={styles.reportsCard}>
          <Text style={styles.analyticsTitle}>📄 财务报表</Text>
          
          <View style={styles.reportOptions}>
            <TouchableOpacity 
              style={styles.reportOption}
              onPress={() => Alert.alert(t.financeMonthlyReport, t.financeMonthlyReportHint)}
            >
              <Text style={styles.reportOptionIcon}>📊</Text>
              <Text style={styles.reportOptionTitle}>月度财务报表</Text>
              <Text style={styles.reportOptionDesc}>收支详情和趋势分析</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.reportOption}
              onPress={() => Alert.alert(t.financeExportData, t.financeExportDataHint)}
            >
              <Text style={styles.reportOptionIcon}>📤</Text>
              <Text style={styles.reportOptionTitle}>导出财务数据</Text>
              <Text style={styles.reportOptionDesc}>Excel格式导出</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.reportOption}
              onPress={() => Alert.alert(t.financeTaxReport, t.financeTaxReportHint)}
            >
              <Text style={styles.reportOptionIcon}>🧾</Text>
              <Text style={styles.reportOptionTitle}>税务报表</Text>
              <Text style={styles.reportOptionDesc}>税务申报专用</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 预算管理 */}
        <View style={styles.reportsCard}>
          <Text style={styles.analyticsTitle}>💰 预算管理</Text>
          
          <View style={styles.budgetOverview}>
            <Text style={styles.budgetTitle}>本月预算执行情况</Text>
            
            {['快递员佣金', '员工工资', '运营支出', '车辆维护'].map(category => {
              const spent = records
                .filter(r => r.record_type === 'expense' && r.category === category && 
                       r.record_date.startsWith(new Date().toISOString().slice(0, 7)))
                .reduce((sum, r) => sum + r.amount, 0);
              
              const budget = Math.floor(Math.random() * 2000000) + 1000000; // 模拟预算
              const percentage = (spent / budget * 100).toFixed(1);
              
              return (
                <View key={category} style={styles.budgetItem}>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.budgetCategory}>{category}</Text>
                    <Text style={styles.budgetAmount}>
                      {spent.toLocaleString()} / {budget.toLocaleString()} MMK
                    </Text>
                  </View>
                  <View style={styles.budgetProgressContainer}>
                    <View style={styles.budgetProgressBar}>
                      <View 
                        style={[
                          styles.budgetProgressFill, 
                          { 
                            width: `${Math.min(100, Number(percentage))}%`,
                            backgroundColor: Number(percentage) > 90 ? '#e74c3c' : 
                                           Number(percentage) > 70 ? '#f39c12' : '#27ae60'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.budgetPercentage, {
                      color: Number(percentage) > 90 ? '#e74c3c' : 
                             Number(percentage) > 70 ? '#f39c12' : '#27ae60'
                    }]}>
                      {percentage}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }
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
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
  },
  addIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  // 标签页样式
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2c5282',
    backgroundColor: '#f8fafc',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2c5282',
    fontWeight: '600',
  },
  tabContent: {
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summaryPeriod: {
    fontSize: 13,
    color: '#999',
  },
  summaryStats: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  recordCardSelected: {
    borderWidth: 2,
    borderColor: '#2c5282',
    backgroundColor: '#f8fafc',
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  typeEmoji: {
    fontSize: 24,
  },
  recordInfo: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  notes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  // 概览页面样式
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mainStatCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mainStatIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mainStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  profitCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profitIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  profitInfo: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profitAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodSection: {
    marginBottom: 20,
  },
  periodStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  periodStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  periodStatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  periodStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  periodStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  periodStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  pendingIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingCount: {
    fontSize: 12,
    color: '#666',
  },
  recentSection: {
    marginBottom: 20,
  },
  recentRecordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recentRecordInfo: {
    flex: 1,
  },
  recentRecordCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  recentRecordDate: {
    fontSize: 12,
    color: '#666',
  },
  recentRecordAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 记录页面样式
  recordsTabContainer: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  controlsBar: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSection: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  batchButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  batchControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 14,
    color: '#2c5282',
    fontWeight: '600',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchDeleteButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  batchDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBatchButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelBatchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxContainer: {
    paddingLeft: 16,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  colorIndicator: {
    width: 4,
  },
  quickDeleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    marginRight: 16,
    borderRadius: 20,
  },
  quickDeleteIcon: {
    fontSize: 16,
  },
  // 分析页面样式
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  trendChart: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  chartPlaceholder: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  chartSubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  categoryAnalysisItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryAnalysisInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryAnalysisName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  categoryAnalysisAmount: {
    fontSize: 14,
    color: '#666',
  },
  categoryProgressBar: {
    height: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#e74c3c',
    borderRadius: 4,
  },
  efficiencyMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  efficiencyItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  efficiencyIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  efficiencyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  efficiencyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  // 报表页面样式
  reportsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  reportOptions: {
    gap: 12,
  },
  reportOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  reportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  reportOptionDesc: {
    fontSize: 12,
    color: '#666',
  },
  budgetOverview: {
    gap: 12,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  budgetItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  budgetInfo: {
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 12,
    color: '#666',
  },
  budgetProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  // 模态框样式
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  largeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    maxHeight: 500,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    height: 50,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  selectedTypeButton: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  typeSelectorIcon: {
    fontSize: 20,
  },
  typeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedTypeText: {
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
});
