import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceHealthService, HealthReport } from '../services/deviceHealthService';
import { LinearGradient } from 'expo-linear-gradient';

export const DeviceHealthShield = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [showDetails, setShowDetail] = useState(false);

  useEffect(() => {
    const runCheck = async () => {
      const result = await deviceHealthService.performFullCheck();
      setReport(result);
    };

    runCheck();
    const interval = setInterval(runCheck, 60000 * 5); // 每 5 分钟自动检查一次
    return () => clearInterval(interval);
  }, []);

  if (!report || report.isOk) return null;

  const getAlertCount = () => {
    let count = 0;
    if (report.battery.isLow) count++;
    if (!report.location.isPrecise) count++;
    if (report.storage.isLow) count++;
    if (!report.network.isConnected) count++;
    return count;
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.shieldBtn} 
        onPress={() => setShowDetail(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#ef4444', '#b91c1c']}
          style={styles.shieldGradient}
        >
          <Ionicons name="warning" size={18} color="white" />
          <Text style={styles.shieldText}>设备健康警告 ({getAlertCount()})</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={showDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛠️ 设备健康报告</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <HealthItem 
                icon="battery-dead" 
                label="电池电量" 
                value={`${report.battery.level}%`} 
                isError={report.battery.isLow}
                hint="请及时充电，以免影响配送更新"
              />
              <HealthItem 
                icon="location" 
                label="GPS 精度" 
                value={report.location.isPrecise ? '良好' : '偏差较大'} 
                isError={!report.location.isPrecise}
                hint="请确保处于开阔地带，或重启定位权限"
              />
              <HealthItem 
                icon="cloud-upload" 
                label="存储空间" 
                value={report.storage.isLow ? '不足' : '充足'} 
                isError={report.storage.isLow}
                hint="空间不足可能导致拍照存证失败"
              />
              <HealthItem 
                icon="wifi" 
                label="网络连接" 
                value={report.network.isConnected ? '已连接' : '已断开'} 
                isError={!report.network.isConnected}
                hint="当前处于离线模式，操作将自动进入缓存"
              />
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setShowDetail(false)}
            >
              <Text style={styles.closeBtnText}>我知道了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const HealthItem = ({ icon, label, value, isError, hint }: any) => (
  <View style={styles.itemContainer}>
    <View style={styles.itemHeader}>
      <View style={styles.itemLabelRow}>
        <Ionicons name={icon} size={20} color={isError ? '#ef4444' : '#10b981'} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Text style={[styles.itemValue, isError && styles.errorText]}>{value}</Text>
    </View>
    {isError && <Text style={styles.hintText}>⚠️ {hint}</Text>}
  </View>
);

const styles = StyleSheet.create({
  shieldBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shieldGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  shieldText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    marginBottom: 20,
  },
  itemContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  hintText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    fontStyle: 'italic',
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
