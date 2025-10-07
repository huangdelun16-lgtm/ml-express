import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { packageService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentCourierName, setCurrentCourierName] = useState('');
  const [currentCourierId, setCurrentCourierId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // 添加处理状态
  const scannedDataRef = useRef<string | null>(null); // 添加ref来跟踪已扫描的数据
  const lastScanTimeRef = useRef<number>(0); // 添加时间戳防止快速重复扫描

  // 加载当前骑手信息 - 必须在所有条件渲染之前
  useEffect(() => {
    loadCurrentCourierInfo();
  }, []);

  const loadCurrentCourierInfo = async () => {
    try {
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      const userId = await AsyncStorage.getItem('currentUser') || '';
      setCurrentCourierName(userName);
      setCurrentCourierId(userId);
    } catch (error) {
      console.error('加载骑手信息失败:', error);
    }
  };

  // 重置扫描状态
  const resetScanState = () => {
    console.log('重置扫描状态');
    setScanned(false);
    setIsProcessing(false);
    scannedDataRef.current = null;
    lastScanTimeRef.current = 0; // 重置时间戳
  };

  // 检查相机权限状态
  useEffect(() => {
    if (permission) {
      console.log('相机权限状态:', permission.granted);
      if (!permission.granted) {
        setCameraError('相机权限未授予');
      } else {
        setCameraError(null);
      }
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>正在检查相机权限...</Text>
          <Text style={styles.permissionDesc}>请稍候</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>需要相机权限</Text>
          <Text style={styles.permissionDesc}>扫描包裹二维码需要使用相机</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>授予权限</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: any) => {
    const currentTime = Date.now();
    
    // 多重检查防止重复扫描
    if (scanned || isProcessing) {
      console.log('扫描被阻止：已扫描或正在处理中');
      return;
    }
    
    // 检查是否扫描了相同的数据
    if (scannedDataRef.current === data) {
      console.log('扫描被阻止：相同数据已处理');
      return;
    }
    
    // 防抖：如果距离上次扫描时间少于2秒，忽略
    if (currentTime - lastScanTimeRef.current < 2000) {
      console.log('扫描被阻止：防抖保护');
      return;
    }
    
    console.log('开始处理扫描数据:', data);
    
    // 设置处理状态和时间戳
    setScanned(true);
    setIsProcessing(true);
    scannedDataRef.current = data;
    lastScanTimeRef.current = currentTime;
    
    try {
      await searchPackage(data);
    } catch (error) {
      console.error('扫描处理错误:', error);
      // 发生错误时重置状态
      resetScanState();
    }
  };

  const searchPackage = async (packageId: string) => {
    try {
      // 检查是否是店长收件码
      if (packageId.startsWith('STORE_')) {
        await handleStoreReceiveCode(packageId);
        return;
      }

      const packages = await packageService.getAllPackages();
      const foundPackage = packages.find(p => p.id === packageId);

      if (foundPackage) {
        // 检查包裹状态
        if (foundPackage.status === '已取件') {
          Alert.alert(
            '包裹已取件',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}`,
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
        } else if (foundPackage.status === '待取件') {
          Alert.alert(
            '确认取件',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n\n是否确认取件？`,
            [
              { text: '取消', onPress: resetScanState },
              {
                text: '确认取件',
                onPress: async () => {
                  await confirmPickup(foundPackage);
                }
              }
            ]
          );
        } else {
          Alert.alert(
            '包裹状态异常',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}`,
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
        }
      } else {
        Alert.alert('未找到', '该包裹不存在或未分配给你', [
          { text: '确定', onPress: resetScanState }
        ]);
      }
    } catch (error) {
      Alert.alert('错误', '查询包裹失败', [
        { text: '确定', onPress: resetScanState }
      ]);
    }
  };

  const handleStoreReceiveCode = async (receiveCode: string) => {
    try {
      // 解析收件码: STORE_{store_id}_{store_code}
      const parts = receiveCode.split('_');
      if (parts.length !== 3) {
        Alert.alert('收件码格式错误', '无法识别此收件码', [
          { text: '确定', onPress: resetScanState }
        ]);
        return;
      }

      const storeId = parts[1];
      const storeCode = parts[2];

      Alert.alert(
        '店长收件码',
        `店铺代码：${storeCode}\n收件码：${receiveCode}\n\n骑手送件时必须扫描此码确认送达`,
        [
          { text: '确定', onPress: resetScanState }
        ]
      );
    } catch (error) {
      Alert.alert('错误', '处理收件码失败', [
        { text: '确定', onPress: resetScanState }
      ]);
    }
  };

  const confirmPickup = async (packageData: any) => {
    try {
      const pickupTime = new Date().toLocaleString('zh-CN');
      
      // 使用实际的骑手账号信息
      const courierName = currentCourierName || '未知骑手';
      const courierId = currentCourierId || 'unknown';
      
      const success = await packageService.updatePackageStatus(
        packageData.id,
        '已取件',
        pickupTime,
        undefined, // deliveryTime
        courierName
      );

      if (success) {
        Alert.alert(
          '取件成功！',
          `包裹编号：${packageData.id}\n收件人：${packageData.receiver_name}\n取件时间：${pickupTime}\n负责骑手：${courierName}`,
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
      } else {
        Alert.alert('取件失败', '更新包裹状态失败，请重试', [
          { text: '确定', onPress: resetScanState }
        ]);
      }
    } catch (error) {
      Alert.alert('取件失败', '网络错误，请重试', [
        { text: '确定', onPress: resetScanState }
      ]);
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      Alert.alert('提示', '请输入包裹编号');
      return;
    }
    await searchPackage(manualInput.trim());
    setManualInput('');
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 扫描包裹</Text>
        <TouchableOpacity 
          onPress={() => setShowManualInput(!showManualInput)}
          style={styles.manualButton}
        >
          <Text style={styles.manualButtonText}>
            {showManualInput ? '扫码' : '手动输入'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 扫码界面 */}
      {!showManualInput ? (
        <>
          {cameraError ? (
            <View style={styles.cameraErrorContainer}>
              <Text style={styles.cameraErrorIcon}>📷</Text>
              <Text style={styles.cameraErrorTitle}>相机启动失败</Text>
              <Text style={styles.cameraErrorDesc}>{cameraError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setCameraError(null);
                  // 重新请求权限
                  requestPermission();
                }}
              >
                <Text style={styles.retryButtonText}>重试</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
              }}
              onCameraReady={() => {
                console.log('相机已准备就绪');
                setCameraError(null);
              }}
              onMountError={(error) => {
                console.error('相机挂载错误:', error);
                setCameraError('相机无法启动，请检查设备权限');
              }}
            >
              {/* 扫描框 */}
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
            </CameraView>
          )}

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              将包裹二维码对准扫描框
            </Text>
            {scanned && (
              <TouchableOpacity 
                style={styles.rescanButton}
                onPress={resetScanState}
              >
                <Text style={styles.rescanText}>重新扫描</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        /* 手动输入界面 */
        <View style={styles.manualContainer}>
          <View style={styles.manualContent}>
            <Text style={styles.manualTitle}>手动输入包裹编号</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：PKG001"
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleManualSearch}
            >
              <Text style={styles.searchButtonText}>查询包裹</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  camera: {
    flex: 1,
  },
  cameraErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  cameraErrorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  cameraErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  cameraErrorDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  cornerTopLeft: {
    top: -120,
    left: -120,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: -120,
    right: -120,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: -120,
    left: -120,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: -120,
    right: -120,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  rescanButton: {
    marginTop: 12,
    backgroundColor: '#2c5282',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manualContainer: {
    flex: 1,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    padding: 20,
  },
  manualContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  searchButton: {
    backgroundColor: '#2c5282',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  cardAddress: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  packageCount: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  packageCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c5282',
  },
});
