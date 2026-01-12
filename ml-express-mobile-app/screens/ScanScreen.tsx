import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { packageService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { useLanguageStyles } from '../hooks/useLanguageStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanScreen({ navigation }: any) {
  const { language } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentCourierName, setCurrentCourierName] = useState('');
  const [currentCourierId, setCurrentCourierId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const scannedDataRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  
  // 扫描动画
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // 翻译文本
  const translations = {
    zh: {
      headerTitle: '📦 智能扫码',
      headerSubtitle: '快速扫描包裹 · 中转码',
      scanButton: '📷 扫码',
      inputButton: '⌨️ 输入',
      checkingPermission: '正在检查相机权限...',
      pleaseWait: '请稍候',
      needPermission: '需要相机权限',
      permissionDesc: '扫描包裹二维码、中转码需要使用相机',
      grantPermission: '授予权限',
      networkNotConnected: '网络未连接',
      checkNetwork: '请检查网络连接后重试',
      ok: '确定',
      cameraError: '相机错误',
      cameraNotGranted: '相机权限未授予',
      grantCameraPermission: '请授予相机权限以使用扫码功能',
      alignFrame: '对准扫描框',
      alignFrameDesc: '将二维码或条形码对准扫描框',
      qrCode: 'QR码',
      barcode: '条形码',
      transferCode: '中转码',
      processing: '处理中...',
      processingDesc: '正在查询包裹信息',
      scanSuccess: '扫描成功',
      rescan: '🔄 重新扫描',
      manualInputTitle: '手动输入包裹编号或中转码',
      inputPlaceholder: '例如：PKG001 或 TCABC1234',
      searchPackage: '查询包裹',
    },
    en: {
      headerTitle: '📦 Smart Scan',
      headerSubtitle: 'Quick scan packages · Transfer codes',
      scanButton: '📷 Scan',
      inputButton: '⌨️ Input',
      checkingPermission: 'Checking camera permission...',
      pleaseWait: 'Please wait',
      needPermission: 'Camera permission required',
      permissionDesc: 'Scanning package QR codes and transfer codes requires camera access',
      grantPermission: 'Grant Permission',
      networkNotConnected: 'Network not connected',
      checkNetwork: 'Please check your network connection and try again',
      ok: 'OK',
      cameraError: 'Camera Error',
      cameraNotGranted: 'Camera permission not granted',
      grantCameraPermission: 'Please grant camera permission to use scan feature',
      alignFrame: 'Align with frame',
      alignFrameDesc: 'Align QR code or barcode with the scanning frame',
      qrCode: 'QR Code',
      barcode: 'Barcode',
      transferCode: 'Transfer Code',
      processing: 'Processing...',
      processingDesc: 'Querying package information',
      scanSuccess: 'Scan Success',
      rescan: '🔄 Rescan',
      manualInputTitle: 'Manually enter package ID or transfer code',
      inputPlaceholder: 'e.g.: PKG001 or TCABC1234',
      searchPackage: 'Search Package',
    },
    my: {
      // 缅文版使用英文，但字体会缩小2号
      headerTitle: '📦 Smart Scan',
      headerSubtitle: 'Quick scan packages · Transfer codes',
      scanButton: '📷 Scan',
      inputButton: '⌨️ Input',
      checkingPermission: 'Checking camera permission...',
      pleaseWait: 'Please wait',
      needPermission: 'Camera permission required',
      permissionDesc: 'Scanning package QR codes and transfer codes requires camera access',
      grantPermission: 'Grant Permission',
      networkNotConnected: 'Network not connected',
      checkNetwork: 'Please check your network connection and try again',
      ok: 'OK',
      cameraError: 'Camera Error',
      cameraNotGranted: 'Camera permission not granted',
      grantCameraPermission: 'Please grant camera permission to use scan feature',
      alignFrame: 'Align with frame',
      alignFrameDesc: 'Align QR code or barcode with the scanning frame',
      qrCode: 'QR Code',
      barcode: 'Barcode',
      transferCode: 'Transfer Code',
      processing: 'Processing...',
      processingDesc: 'Querying package information',
      scanSuccess: 'Scan Success',
      rescan: '🔄 Rescan',
      manualInputTitle: 'Manually enter package ID or transfer code',
      inputPlaceholder: 'e.g.: PKG001 or TCABC1234',
      searchPackage: 'Search Package',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  // 应用语言样式（缅语字体缩小2号）- 必须在所有使用styles之前
  const styles = useLanguageStyles(baseStyles);

  // 加载当前骑手信息 - 必须在所有条件渲染之前
  useEffect(() => {
    loadCurrentCourierInfo();
  }, []);

  // 监听网络状态
  useEffect(() => {
    // 初始检查
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // 监听网络状态变化
    const unsubscribe = NetInfo.addEventListener(state => {
      const isNowOnline = state.isConnected ?? false;
      setIsOnline(isNowOnline);
      if (isNowOnline && networkError) {
        // 网络恢复时清除错误
        setNetworkError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [networkError]);

  // 启动扫描线动画
  useEffect(() => {
    if (!scanned && !showManualInput) {
      // 扫描线动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 脉冲动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanned, showManualInput]);

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
        // 权限已授予，清除之前的错误
        setCameraError(null);
        console.log('相机权限已授予，准备初始化相机');
      }
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>{t.checkingPermission}</Text>
          <Text style={styles.permissionDesc}>{t.pleaseWait}</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>{t.needPermission}</Text>
          <Text style={styles.permissionDesc}>{t.permissionDesc}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t.grantPermission}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 注意：相机错误现在在扫码界面中显示，而不是阻止整个页面

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
      // 检查网络状态
      if (!isOnline) {
        Alert.alert(
          '网络未连接',
          '请检查网络连接后重试',
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
        return;
      }

      // 检查是否是店长收件码
      if (packageId.startsWith('STORE_')) {
        await handleStoreReceiveCode(packageId);
        return;
      }

      // 检查是否是中转码
      if (packageId.startsWith('TC')) {
        await handleTransferCode(packageId);
        return;
      }

      let packages: any[] = [];
      try {
        packages = await packageService.getAllPackages();
      } catch (error: any) {
        console.error('获取包裹列表失败:', error);
        const errorMessage = error?.message || '未知错误';
        
        // 检查是否是网络错误
        if (
          errorMessage.includes('Network') || 
          errorMessage.includes('connection') ||
          errorMessage.includes('gateway') ||
          errorMessage.includes('Network connection lost')
        ) {
          setNetworkError('网络连接失败，请检查网络后重试');
          Alert.alert(
            '网络错误',
            '无法连接到服务器，请检查网络连接后重试',
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
          return;
        }
        
        // 其他错误
        Alert.alert(
          '查询失败',
          '无法获取包裹列表，请稍后重试',
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
        return;
      }

      const foundPackage = packages.find(p => p.id === packageId);

      if (foundPackage) {
        // 检查包裹状态 - 只有"待取件"状态的包裹才能扫码取件
        if (foundPackage.status === '待取件') {
          Alert.alert(
            '确认取件',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n\n扫码确认取件，状态将更新为"已取件"`,
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
        } else if (foundPackage.status === '已取件') {
          Alert.alert(
            '包裹已取件',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}\n\n请点击"开始配送"按钮开始配送`,
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
        } else if (foundPackage.status === '配送中') {
          Alert.alert(
            '包裹配送中',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}\n\n包裹正在配送中，请继续配送流程`,
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
        } else if (foundPackage.status === '已送达') {
          Alert.alert(
            '包裹已送达',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}\n\n包裹已完成配送`,
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
        } else {
          Alert.alert(
            '包裹状态异常',
            `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n状态：${foundPackage.status}\n\n只有"待取件"状态的包裹才能扫码取件`,
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
    } catch (error: any) {
      console.error('查询包裹失败:', error);
      const errorMessage = error?.message || '未知错误';
      
      // 检查是否是网络错误
      if (
        errorMessage.includes('Network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('gateway') ||
        errorMessage.includes('Network connection lost')
      ) {
        setNetworkError('网络连接失败，请检查网络后重试');
        Alert.alert(
          '网络错误',
          '无法连接到服务器，请检查网络连接后重试',
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
      } else {
        Alert.alert('错误', '查询包裹失败，请稍后重试', [
          { text: '确定', onPress: resetScanState }
        ]);
      }
    }
  };

  const handleTransferCode = async (transferCode: string) => {
    try {
      console.log('处理中转码:', transferCode);
      
      // 检查网络状态
      if (!isOnline) {
        Alert.alert(
          '网络未连接',
          '请检查网络连接后重试',
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
        return;
      }

      // 查找具有此中转码的包裹
      let packages: any[] = [];
      try {
        packages = await packageService.getAllPackages();
      } catch (error: any) {
        console.error('获取包裹列表失败:', error);
        const errorMessage = error?.message || '未知错误';
        
        if (
          errorMessage.includes('Network') || 
          errorMessage.includes('connection') ||
          errorMessage.includes('gateway') ||
          errorMessage.includes('Network connection lost')
        ) {
          setNetworkError('网络连接失败，请检查网络后重试');
          Alert.alert(
            '网络错误',
            '无法连接到服务器，请检查网络连接后重试',
            [
              { text: '确定', onPress: resetScanState }
            ]
          );
          return;
        }
        
        Alert.alert(
          '查询失败',
          '无法获取包裹列表，请稍后重试',
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
        return;
      }
      
      const foundPackage = packages.find(p => p.transfer_code === transferCode);
      
      if (!foundPackage) {
        Alert.alert('中转码无效', '未找到与此中转码对应的包裹', [
          { text: '确定', onPress: resetScanState }
        ]);
        return;
      }
      
      // 检查包裹状态 - 允许"已送达"（中转站）和"待派送"状态的包裹
      if (foundPackage.status !== '待派送' && foundPackage.status !== '已送达') {
        Alert.alert(
          '包裹状态错误',
          `包裹编号：${foundPackage.id}\n当前状态：${foundPackage.status}\n\n只有"待派送"或"已送达"（中转站）状态的包裹才能被分配`,
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
        return;
      }
      
      // 确认分配包裹给当前骑手
      const statusText = foundPackage.status === '已送达' ? '已到达中转站' : foundPackage.status;
      Alert.alert(
        '确认分配包裹',
        `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}\n寄件人：${foundPackage.sender_name}\n当前状态：${statusText}\n中转码：${transferCode}\n\n是否将此包裹分配给骑手：${currentCourierName}？`,
        [
          { text: '取消', onPress: resetScanState },
          {
            text: '确认分配',
            onPress: async () => {
              await assignPackageToCourier(foundPackage);
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('处理中转码失败:', error);
      Alert.alert('错误', '处理中转码失败，请重试', [
        { text: '确定', onPress: resetScanState }
      ]);
    }
  };

  const assignPackageToCourier = async (pkg: any) => {
    try {
      console.log('开始分配包裹给骑手:', pkg.id, currentCourierId);
      
      // 更新包裹状态为"派送中"，并分配骑手
      const success = await packageService.updatePackageStatus(
        pkg.id,
        '派送中',
        pkg.pickup_time,
        undefined, // 保持delivery_time为空，因为还在派送中
        currentCourierId, // 分配当前骑手
        pkg.transfer_code // 保持中转码
      );
      
      if (success) {
        Alert.alert(
          '分配成功',
          `包裹 ${pkg.id} 已成功分配给骑手：${currentCourierName}\n\n包裹状态已更新为"派送中"`,
          [
            { text: '确定', onPress: resetScanState }
          ]
        );
      } else {
        Alert.alert('分配失败', '更新包裹状态失败，请重试', [
          { text: '确定', onPress: resetScanState }
        ]);
      }
      
    } catch (error) {
      console.error('分配包裹失败:', error);
      Alert.alert('错误', '分配包裹失败，请重试', [
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

  const scanLineTranslate = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <LinearGradient
        colors={['#2c5282', '#1a365d']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t.headerTitle}</Text>
          <Text style={styles.headerSubtitle}>{t.headerSubtitle}</Text>
          {!isOnline && (
            <View style={styles.networkStatusBadge}>
              <Text style={styles.networkStatusText}>⚠️ {t.networkNotConnected}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => setShowManualInput(!showManualInput)}
          style={styles.manualButton}
        >
          <Text style={styles.manualButtonText}>
            {showManualInput ? t.scanButton : t.inputButton}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* 扫码界面 */}
      {!showManualInput ? (
        <View style={styles.scanContainer}>
          {permission?.granted ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'pdf417'],
                }}
                onCameraReady={() => {
                  console.log('相机已准备就绪');
                  setCameraError(null);
                }}
                onMountError={(error) => {
                  console.error('相机挂载错误:', error);
                  setCameraError('相机无法启动，请检查设备权限或重启应用');
                }}
              />
              
              {/* 🚀 优化布局：使用绝对定位覆盖层，提高启动速度和稳定性 */}
              <View style={styles.overlayContainer}>
                {/* 遮罩层 */}
                <View style={styles.maskContainer}>
                  <View style={styles.maskRow}>
                    <View style={styles.maskCell} />
                    <View style={styles.maskMiddle} />
                    <View style={styles.maskCell} />
                  </View>
                  <View style={styles.maskCenter}>
                    <View style={styles.maskCell} />
                    <View style={styles.scanArea}>
                      {/* 扫描框 */}
                      <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnimation }] }]}>
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />
                        
                        {/* 扫描线 */}
                        {!scanned && (
                          <Animated.View 
                            style={[
                              styles.scanLine,
                              {
                                transform: [{ translateY: scanLineTranslate }]
                              }
                            ]} 
                          />
                        )}
                      </Animated.View>
                    </View>
                    <View style={styles.maskCell} />
                  </View>
                  <View style={styles.maskRow}>
                    <View style={styles.maskCell} />
                    <View style={styles.maskMiddle} />
                    <View style={styles.maskCell} />
                  </View>
                </View>
              </View>

              {cameraError && (
                <View style={styles.cameraErrorOverlay}>
                  <View style={styles.cameraErrorCard}>
                    <Text style={styles.cameraErrorIcon}>⚠️</Text>
                    <Text style={styles.cameraErrorTitle}>{t.cameraError}</Text>
                    <Text style={styles.cameraErrorDesc}>{cameraError}</Text>
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={() => {
                        setCameraError(null);
                        // 重新请求权限
                        requestPermission();
                      }}
                    >
                      <LinearGradient
                        colors={['#3498db', '#2980b9']}
                        style={styles.retryButtonGradient}
                      >
                        <Text style={styles.retryButtonText}>{t.ok}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.cameraErrorContainer}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.cameraErrorIcon}>📷</Text>
              </View>
              <Text style={styles.cameraErrorTitle}>{t.cameraNotGranted}</Text>
              <Text style={styles.cameraErrorDesc}>{t.grantCameraPermission}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={requestPermission}
              >
                <LinearGradient
                  colors={['#3498db', '#2980b9']}
                  style={styles.retryButtonGradient}
                >
                  <Text style={styles.retryButtonText}>{t.grantPermission}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* 提示信息 - 仅在处理中或扫描成功后显示，移除默认的“对准扫描框”卡片 */}
          {(scanned || isProcessing) && (
          <View style={styles.instructions}>
            <View style={styles.instructionCard}>
                {isProcessing ? (
                <>
                  <Text style={styles.instructionEmoji}>⏳</Text>
                  <Text style={styles.instructionTitle}>{t.processing}</Text>
                  <Text style={styles.instructionText}>
                    {t.processingDesc}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.instructionEmoji}>✅</Text>
                  <Text style={styles.instructionTitle}>{t.scanSuccess}</Text>
                  <TouchableOpacity 
                    style={styles.rescanButton}
                    onPress={resetScanState}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.rescanButtonGradient}
                    >
                      <Text style={styles.rescanText}>{t.rescan}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          )}
        </View>
      ) : (
        /* 手动输入界面 */
        <View style={styles.manualContainer}>
          <View style={styles.manualContent}>
            <Text style={styles.manualTitle}>{t.manualInputTitle}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.inputPlaceholder}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleManualSearch}
            >
              <Text style={styles.searchButtonText}>{t.searchPackage}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  manualButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scanContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  maskContainer: {
    flex: 1,
  },
  maskRow: {
    flex: 1,
    flexDirection: 'row',
  },
  maskCenter: {
    height: 280,
    flexDirection: 'row',
  },
  maskCell: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  maskMiddle: {
    width: 280,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10b981',
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10b981',
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10b981',
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10b981',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  cameraErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  cameraErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  cameraErrorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cameraErrorIcon: {
    fontSize: 64,
  },
  cameraErrorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  cameraErrorDesc: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  instructions: {
    backgroundColor: 'transparent',
    padding: 20,
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  instructionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  instructionText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  supportedFormats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  formatBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  rescanButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rescanButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rescanText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  permissionText: {
    fontSize: 64,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    maxWidth: 280,
  },
  permissionButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  networkStatusBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  networkStatusText: {
    color: '#fef2f2',
    fontSize: 11,
    fontWeight: '600',
  },
});
