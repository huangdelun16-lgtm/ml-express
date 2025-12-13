import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { packageService, auditLogService, Package, deliveryPhotoService, deliveryStoreService, supabase } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { geofenceService } from '../services/geofenceService';

export default function PackageDetailScreen({ route, navigation }: any) {
  const { t } = useApp();
  const { package: pkg } = route.params;
  const [currentPackage, setCurrentPackage] = useState<Package>(pkg);
  const [updating, setUpdating] = useState(false);
  
  // 新增状态
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // 扫码相关状态
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const getStatusText = (status: string) => {
    switch (status) {
      case '待取件': return t.pending;
      case '已取件': return t.pickedUp;
      case '配送中': return t.delivering;
      case '已送达': return t.delivered;
      case '已取消': return t.cancelled;
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${currentPackage.receiver_phone}`);
  };

  const handleNavigate = () => {
    const address = encodeURIComponent(currentPackage.receiver_address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  // 送货地址功能
  const handleShowAddress = () => {
    setShowAddressModal(true);
  };

  // 摄像机功能
  const handleOpenCamera = async () => {
    try {
      // 请求相机权限
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      // 启动相机（iOS优化设置 - 极致压缩）
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // iOS专用：降至30%质量，确保流畅上传
        exif: false, // 禁用EXIF数据以提高性能
        base64: false, // 不立即生成base64，避免内存问题
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowPhotoModal(true);
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('相机错误:', error);
      Alert.alert('错误', '无法打开相机，请重试');
    }
  };

  // 将图片转换为base64（优化版 - iOS流畅）
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      console.log('🔄 开始转换照片，URI:', imageUri);
      
      // 使用fetch获取图片数据（更快）
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      console.log('📦 照片Blob大小:', (blob.size / 1024).toFixed(2), 'KB');
      
      // 如果照片仍然太大（>500KB），进一步压缩
      if (blob.size > 500 * 1024) {
        console.log('⚠️ 照片过大，需要进一步压缩');
        // 这里可以添加额外的压缩逻辑
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // 添加超时保护
        const timeout = setTimeout(() => {
          reject(new Error('FileReader超时'));
        }, 8000); // 8秒超时
        
        reader.onloadend = () => {
          clearTimeout(timeout);
          const base64String = reader.result as string;
          // 移除data:image/jpeg;base64,前缀
          const base64Data = base64String.split(',')[1];
          console.log('✅ Base64转换完成，大小:', (base64Data.length / 1024).toFixed(2), 'KB');
          resolve(base64Data);
        };
        
        reader.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ FileReader错误:', error);
          reject(error);
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ 转换图片为base64失败:', error);
      return '';
    }
  };

  // 上传照片功能（优化版本）
  const handleUploadPhoto = async () => {
    if (!capturedPhoto) {
      Alert.alert('提示', '请先拍照');
      return;
    }

    try {
      setUploadingPhoto(true);

      // 获取当前骑手信息
      const userName = await AsyncStorage.getItem('currentUserName') || '未知骑手';

      // 1. 获取位置（使用超时保护和较低精度）
      console.log('📍 正在获取位置...');
      let latitude = 0;
      let longitude = 0;
      
      try {
        const locationPermission = await Location.requestForegroundPermissionsAsync();
        if (locationPermission.status === 'granted') {
          // 使用较低精度和超时，避免卡顿
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, // 从 BestForNavigation 改为 Balanced
            timeInterval: 5000,
            distanceInterval: 10,
          });

          // 5秒超时
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('GPS获取超时')), 5000)
          );

          const location = await Promise.race([locationPromise, timeoutPromise]) as any;
          if (location) {
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            console.log('✅ 位置获取成功:', latitude, longitude);
          }
        }
      } catch (locationError) {
        console.warn('⚠️ 位置获取失败，使用默认坐标:', locationError);
        // 使用默认坐标（曼德勒市中心）
        latitude = 21.9588;
        longitude = 96.0891;
      }

      // 2. 异步保存照片到相册（不阻塞主流程）
      MediaLibrary.requestPermissionsAsync()
        .then(mediaPermission => {
          if (mediaPermission.status === 'granted') {
            MediaLibrary.saveToLibraryAsync(capturedPhoto).catch(error => {
              console.log('⚠️ 保存到相册失败:', error);
            });
          }
        })
        .catch(error => console.log('⚠️ 相册权限请求失败:', error));

      // 3. 转换照片为base64（使用超时保护 - iOS优化）
      console.log('📸 正在压缩照片...');
      let photoBase64 = '';
      
      try {
        const base64Promise = convertImageToBase64(capturedPhoto);
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('照片转换超时')), 8000) // 从10秒减到8秒
        );

        photoBase64 = await Promise.race([base64Promise, timeoutPromise]);
        console.log('✅ 照片转换完成，大小:', (photoBase64.length / 1024).toFixed(2), 'KB');
        
        // 检查照片大小，如果太大则警告
        if (photoBase64.length > 400 * 1024) {
          console.warn('⚠️ 照片Base64较大:', (photoBase64.length / 1024).toFixed(2), 'KB，上传可能较慢');
        }
      } catch (conversionError) {
        console.error('❌ 照片转换失败:', conversionError);
        Alert.alert('❌ 错误', '照片处理失败，请重试\n（提示：请在光线充足的地方拍照）');
        setUploadingPhoto(false);
        return;
      }

      // 4. 保存配送照片到数据库（使用超时保护 - iOS优化）
      console.log('☁️ 正在上传照片到服务器...');
      let photoSaved = false;
      
      try {
        const uploadPromise = deliveryPhotoService.saveDeliveryPhoto({
          packageId: currentPackage.id,
          photoBase64: photoBase64,
          courierName: userName,
          latitude: latitude,
          longitude: longitude,
          locationName: '配送位置'
        });

        // 12秒上传超时（从15秒减到12秒，更快失败提示）
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('照片上传超时')), 12000)
        );

        photoSaved = await Promise.race([uploadPromise, timeoutPromise]);
        
        if (photoSaved) {
          console.log('✅ 照片上传成功！');
        } else {
          console.log('⚠️ 照片上传失败，但继续更新包裹状态');
        }
      } catch (uploadError) {
        console.error('❌ 照片上传失败:', uploadError);
        // 显示警告但继续流程
        console.log('⚠️ 照片上传失败，但继续更新包裹状态');
      }

      // 5. 更新包裹状态为"已送达"并记录店铺信息
      console.log('开始更新包裹状态:', {
        packageId: currentPackage.id,
        status: '已送达',
        deliveryTime: new Date().toISOString(),
        courierName: userName
      });

      const success = await packageService.updatePackageStatus(
        currentPackage.id,
        '已送达',
        undefined, // pickupTime
        new Date().toISOString(), // deliveryTime
        userName // courierName
      );

      console.log('包裹状态更新结果:', success);

      if (success) {
        // 记录配送证明
        const deliveryProof = {
          packageId: currentPackage.id,
          photoUri: capturedPhoto,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          courier: userName,
          photoUploaded: photoSaved
        };

        console.log('配送证明记录:', deliveryProof);

        // 更新本地状态
        setCurrentPackage({ ...currentPackage, status: '已送达' });

        // 生成详细的成功消息
        let successMessage = `包裹已成功送达\n\n📦 包裹编号：${currentPackage.id}\n👤 骑手：${userName}\n📍 位置：${latitude?.toFixed(6) || 'N/A'}, ${longitude?.toFixed(6) || 'N/A'}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n`;
        
        if (photoSaved) {
          successMessage += `\n✅ 配送照片已上传到服务器`;
        } else {
          successMessage += `\n⚠️ 配送照片已保存到本地相册\n（服务器上传失败，但状态已更新）`;
        }

        Alert.alert(
          '✅ 配送完成！',
          successMessage,
          [
            {
              text: '确定',
              onPress: () => {
                setShowPhotoModal(false);
                setCapturedPhoto(null);
                setUploadingPhoto(false);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '⚠️ 部分成功', 
          `配送照片${photoSaved ? '已上传' : '已保存到本地'}\n位置: ${latitude?.toFixed(6) || 'N/A'}, ${longitude?.toFixed(6) || 'N/A'}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n⚠️ 但包裹状态更新失败，请稍后重试`,
          [
            {
              text: '确定',
              onPress: () => {
                setUploadingPhoto(false);
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('上传照片失败:', error);
      Alert.alert('上传失败', '网络错误，请重试');
      setUploadingPhoto(false);
    }
  };

  // 扫码相关函数
  const handleStartScan = async () => {
    try {
      // 检查权限
      if (!permission) {
        Alert.alert('错误', '无法访问相机权限');
        return;
      }

      if (!permission.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('权限被拒绝', '需要相机权限才能扫码');
          return;
        }
      }

      setScanning(true);
      setScannedData(null);
    } catch (error) {
      console.error('开始扫码失败:', error);
      Alert.alert('错误', '无法启动扫码功能');
    }
  };

  // 扫码功能处理函数
  const handleScanCode = async (data: string) => {
    if (!data) return;

    console.log('扫描到数据:', data);
    setScannedData(data);
    setScanning(false);
    setShowScanModal(false);

    // 1. 检查是否是当前包裹ID或中转码
    if (data === currentPackage.id || (currentPackage.transfer_code && data === currentPackage.transfer_code)) {
        if (currentPackage.status === '待取件') {
            Alert.alert(
                '确认取件',
                `扫码成功！\n包裹ID: ${currentPackage.id}\n\n确认取件？`,
                [
                    { text: '取消', style: 'cancel' },
                    { 
                        text: '确认', 
                        onPress: () => proceedWithStatusUpdate('已取件', '扫码确认取件') 
                    }
                ]
            );
        } else if (currentPackage.status === '已取件') {
             Alert.alert('提示', '该包裹已取件，请开始配送');
        } else if (currentPackage.status === '配送中') {
             Alert.alert('提示', '该包裹正在配送中');
        } else if (currentPackage.status === '已送达') {
             Alert.alert('提示', '该包裹已送达');
        } else {
             Alert.alert('提示', `扫码成功，当前状态: ${currentPackage.status}`);
        }
        return;
    }

    // 2. 检查是否是店长收件码
    if (data.startsWith('STORE_')) {
      const storeInfo = data.replace('STORE_', '');
      const [storeId] = storeInfo.split('_');
      
      try {
        const store = await deliveryStoreService.getStoreById(storeId);
        const storeName = store ? store.store_name : `店铺${storeId}`;
        
        Alert.alert(
          '确认送达',
          `识别到店铺收件码\n\n店铺：${storeName}\n\n确认将包裹标记为已送达？`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确认送达',
              onPress: () => proceedWithStatusUpdate('已送达', `扫码送达店铺: ${storeName}`)
            }
          ]
        );
      } catch (err) {
        console.error('获取店铺信息失败:', err);
        Alert.alert('错误', '无法获取店铺信息');
      }
      return;
    }

    // 3. 不匹配
    Alert.alert(
      '扫码结果',
      `扫描内容：${data}\n\n⚠️ 与当前包裹ID不匹配`,
      [{ text: '确定' }]
    );
  };

  const handleOpenScanModal = () => {
    setShowScanModal(true);
    setScanning(false);
    setScannedData(null);
  };

  const updateStatus = async (newStatus: string) => {
    const oldStatus = currentPackage.status;
    
    // 如果是标记"已送达"，需要先进行地理围栏验证
    if (newStatus === '已送达') {
      setUpdating(true);
      try {
        const currentUser = await AsyncStorage.getItem('currentUser') || 'unknown';
        const currentUserName = await AsyncStorage.getItem('currentUserName') || '未知用户';
        
        // 执行地理围栏验证
        console.log('开始地理围栏验证...');
        const validation = await geofenceService.validateDelivery(
          currentPackage.id,
          currentUser,
          currentUserName,
          currentPackage.receiver_latitude,
          currentPackage.receiver_longitude
        );
        
        console.log('地理围栏验证结果:', validation);
        
        // 如果不允许送达
        if (!validation.allowed) {
          setUpdating(false);
          Alert.alert(
            '⚠️ 无法标记已送达',
            validation.message,
            [{ text: '我知道了', style: 'default' }]
          );
          return;
        }
        
        // 如果允许但有警告
        if (validation.alertCreated) {
          Alert.alert(
            '⚠️ 位置验证警告',
            validation.message + '\n\n是否继续标记已送达？',
            [
              { text: '取消', style: 'cancel', onPress: () => setUpdating(false) },
              { 
                text: '继续', 
                style: 'default',
                onPress: () => proceedWithStatusUpdate(newStatus, validation.message)
              }
            ]
          );
          return;
        }
        
        // 位置验证通过，继续更新
        Alert.alert(
          '✅ 位置验证通过',
          validation.message + '\n\n是否确认标记已送达？',
          [
            { text: '取消', style: 'cancel', onPress: () => setUpdating(false) },
            { 
              text: '确认送达', 
              style: 'default',
              onPress: () => proceedWithStatusUpdate(newStatus, validation.message)
            }
          ]
        );
      } catch (error) {
        console.error('地理围栏验证异常:', error);
        setUpdating(false);
        Alert.alert('错误', '位置验证失败，请重试');
      }
      return;
    }
    
    // 其他状态更新（已取件、配送中等）
    Alert.alert(
      '确认更新',
      `将包裹状态从「${oldStatus}」更新为「${newStatus}」？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => proceedWithStatusUpdate(newStatus)
        }
      ]
    );
  };
  
  // 实际执行状态更新的函数
  const proceedWithStatusUpdate = async (newStatus: string, locationMessage?: string) => {
    setUpdating(true);
    try {
      let pickupTime = '';
      let deliveryTime = '';
      
      if (newStatus === '已取件') {
        pickupTime = new Date().toLocaleString('zh-CN');
      }
      if (newStatus === '已送达') {
        deliveryTime = new Date().toLocaleString('zh-CN');
      }

      const success = await packageService.updatePackageStatus(
        currentPackage.id,
        newStatus,
        pickupTime,
        deliveryTime
      );

      if (success) {
        // 记录审计日志
        const currentUser = await AsyncStorage.getItem('currentUser') || 'unknown';
        const currentUserName = await AsyncStorage.getItem('currentUserName') || '未知用户';
        
        await auditLogService.log({
          user_id: currentUser,
          user_name: currentUserName,
          action_type: 'update',
          module: 'packages',
          target_id: currentPackage.id,
          target_name: `包裹 ${currentPackage.id}`,
          action_description: `移动端更新包裹状态 → ${newStatus}${locationMessage ? ' (位置已验证)' : ''}`,
          old_value: currentPackage.status,
          new_value: newStatus
        });

        setCurrentPackage({ ...currentPackage, status: newStatus });
        
        let successMessage = '包裹状态已更新';
        if (newStatus === '已送达' && locationMessage) {
          successMessage += '\n' + locationMessage;
        }
        
        Alert.alert('✅ 成功', successMessage);
      } else {
        Alert.alert('❌ 失败', '状态更新失败，请重试');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      Alert.alert('❌ 失败', '网络错误，请检查连接');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.packageDetail}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 包裹编号和状态 */}
        <View style={styles.section}>
          <Text style={styles.packageId}>{currentPackage.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentPackage.status) }]}>
            <Text style={styles.statusText}>{getStatusText(currentPackage.status)}</Text>
          </View>
        </View>

        {/* 收件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📍 {t.receiverInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.receiver}</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.phone}</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.address}</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.receiver_address}</Text>
          </View>
        </View>

        {/* 寄件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📤 {t.senderInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.name}</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.phone}</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.address}</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.sender_address}</Text>
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📦 {t.packageInfo}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.packageType}</Text>
            <Text style={styles.infoValue}>{currentPackage.package_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.weight}</Text>
            <Text style={styles.infoValue}>{currentPackage.weight}</Text>
          </View>
          
          {/* 费用信息区域 */}
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>💰 {t.shippingFee}</Text>
            <Text style={[styles.infoValue, { color: '#3b82f6', fontWeight: '700' }]}>
              {(() => {
                const deliveryFee = parseFloat(currentPackage.delivery_fee?.toString() || '0');
                const priceValue = parseFloat(currentPackage.price?.toString().replace(/[^\d.]/g, '') || '0');
                // 如果 delivery_fee 为 0，使用 price 作为跑腿费
                const value = deliveryFee > 0 ? deliveryFee : priceValue;
                return value % 1 === 0 ? value.toLocaleString() : value.toFixed(2).replace(/\.?0+$/, '');
              })()} MMK
            </Text>
          </View>

          {/* 代收款 */}
          {(() => {
             const codAmount = Number(currentPackage.cod_amount || currentPackage.store_fee || 0);
             // 如果有 delivery_store_id 或者是代收款 > 0，则显示
             const shouldShow = !!currentPackage.delivery_store_id || codAmount > 0;
             
             if (shouldShow) {
               return (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🏦 {t.cod}</Text>
                  <Text style={[styles.infoValue, { color: '#ef4444', fontWeight: '700' }]}>
                    {codAmount > 0 ? `${codAmount.toLocaleString()} MMK` : t.none || '无'}
                  </Text>
                </View>
               );
             }
             return null;
          })()}

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>💵 {t.totalAmount}</Text>
            <Text style={styles.totalValue}>
              {(() => {
                const codAmount = Number(currentPackage.cod_amount || currentPackage.store_fee || 0);
                const deliveryFee = parseFloat(currentPackage.delivery_fee?.toString() || '0');
                const priceValue = parseFloat(currentPackage.price?.toString().replace(/[^\d.]/g, '') || '0');
                const actualDeliveryFee = deliveryFee > 0 ? deliveryFee : priceValue;
                const total = codAmount + actualDeliveryFee;
                return total.toLocaleString() + ' MMK';
              })()}
            </Text>
          </View>

          {currentPackage.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.note}</Text>
              <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.description}</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionButtonText}>📞 {t.call}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
            <Text style={styles.actionButtonText}>🗺️ {t.navigate}</Text>
          </TouchableOpacity>
        </View>

        {/* 新增功能按钮 */}
        <View style={styles.newActionsContainer}>
          <TouchableOpacity style={styles.newActionButton} onPress={handleShowAddress}>
            <Text style={styles.newActionButtonText}>📍 {t.receiverAddress}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.newActionButton} onPress={handleOpenScanModal}>
            <Text style={styles.newActionButtonText}>📱 {t.scan}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.newActionButton} onPress={() => setShowPhotoModal(true)}>
            <Text style={styles.newActionButtonText}>📸 {t.uploadPhoto}</Text>
          </TouchableOpacity>
        </View>

        {/* 状态更新按钮 */}
        <View style={styles.statusUpdateContainer}>
          <Text style={styles.sectionTitle}>{t.updateStatus}</Text>
          <View style={styles.statusButtons}>
            {currentPackage.status === '待取件' && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#3498db' }]}
                onPress={() => updateStatus('已取件')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>✓ {t.pickedUp}</Text>
                )}
              </TouchableOpacity>
            )}

            {currentPackage.status === '已取件' && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#9b59b6' }]}
                onPress={() => updateStatus('配送中')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>🚚 {t.delivering}</Text>
                )}
              </TouchableOpacity>
            )}

            {['已取件', '配送中'].includes(currentPackage.status) && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#27ae60' }]}
                onPress={() => updateStatus('已送达')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>✓ {t.delivered}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 送货地址模态框 */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 {t.receiverAddress}</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>{t.receiver}：</Text>
              <Text style={styles.addressValue}>{currentPackage.receiver_name}</Text>
              
              <Text style={styles.addressLabel}>{t.phone}：</Text>
              <Text style={styles.addressValue}>{currentPackage.receiver_phone}</Text>
              
              <Text style={styles.addressLabel}>{t.address}：</Text>
              <Text style={styles.addressDetail}>{currentPackage.receiver_address}</Text>
              
              <View style={styles.addressActions}>
                <TouchableOpacity style={styles.addressActionButton} onPress={handleCall}>
                  <Text style={styles.addressActionText}>📞 {t.call}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addressActionButton} onPress={handleNavigate}>
                  <Text style={styles.addressActionText}>🗺️ {t.navigate}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 摄像机模态框 */}
      <Modal
        visible={showCameraModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📷 拍照功能</Text>
              <TouchableOpacity
                onPress={() => setShowCameraModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraContent}>
              <Text style={styles.cameraInstruction}>
                点击下方按钮开始拍照，用于配送证明
              </Text>
              
              <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
                <Text style={styles.cameraButtonText}>📷 开始拍照</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 上传照片模态框 */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 上传照片</Text>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoContent}>
              {capturedPhoto ? (
                <>
                  <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
                  <Text style={styles.photoInstruction}>
                    确认上传此照片作为配送证明？
                  </Text>
                  
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.photoActionButton} 
                      onPress={() => {
                        setCapturedPhoto(null);
                        setShowPhotoModal(false);
                        setShowCameraModal(true);
                      }}
                      disabled={uploadingPhoto}
                    >
                      <Text style={styles.photoActionText}>重新拍照</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.photoActionButton, styles.uploadButton]} 
                      onPress={handleUploadPhoto}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.uploadButtonText}>上传中...</Text>
                        </View>
                      ) : (
                        <Text style={styles.uploadButtonText}>确认上传</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.photoInstruction}>
                    请先拍照，然后上传作为配送证明
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.cameraButton} 
                    onPress={() => {
                      setShowPhotoModal(false);
                      setShowCameraModal(true);
                    }}
                  >
                    <Text style={styles.cameraButtonText}>📷 去拍照</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 扫码模态框 */}
      <Modal
        visible={showScanModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowScanModal(false);
          setScanning(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scanModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 扫码</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowScanModal(false);
                  setScanning(false);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.scanContent}>
              {scanning ? (
                <View style={styles.scanCameraContainer}>
                  <CameraView
                    style={styles.scanCamera}
                    facing="back"
                    onBarcodeScanned={({ data }) => handleScanCode(data)}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'upc_e', 'code128', 'code39', 'codabar'],
                    }}
                  />
                  <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame}>
                      <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                    </View>
                    <Text style={styles.scanInstruction}>
                      将二维码/条形码对准扫描框
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.scanStartContent}>
                  <Text style={styles.scanInstruction}>
                    点击开始扫码，扫描包裹二维码或条形码
                  </Text>
                  
                  <TouchableOpacity style={styles.scanStartButton} onPress={handleStartScan}>
                    <Text style={styles.scanStartButtonText}>📱 开始扫码</Text>
                  </TouchableOpacity>
                  
                  {scannedData && (
                    <View style={styles.scanResult}>
                      <Text style={styles.scanResultLabel}>扫描结果：</Text>
                      <Text style={styles.scanResultText}>{scannedData}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
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
    width: 60,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  packageId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 4,
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  totalLabel: {
    width: 80,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3182ce',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusUpdateContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusButtons: {
    gap: 10,
  },
  statusUpdateButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusUpdateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 新增功能按钮样式
  newActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  newActionButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  newActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  // 地址模态框样式
  addressContent: {
    padding: 20,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addressDetail: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 24,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  addressActionButton: {
    flex: 1,
    backgroundColor: '#3182ce',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addressActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 相机模态框样式
  cameraContent: {
    padding: 20,
    alignItems: 'center',
  },
  cameraInstruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  cameraButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 照片模态框样式
  photoContent: {
    padding: 20,
    alignItems: 'center',
  },
  photoPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  photoInstruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoActionText: {
    fontSize: 14,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 扫码相关样式
  scanModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '95%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanContent: {
    flex: 1,
    padding: 20,
  },
  scanCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scanCamera: {
    flex: 1,
    borderRadius: 12,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#27ae60',
    borderWidth: 3,
  },
  scanCornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 8,
  },
  scanStartContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanStartButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  scanStartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanResult: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
  },
  scanResultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scanResultText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
