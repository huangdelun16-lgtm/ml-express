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
import { packageService, auditLogService, Package } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

export default function PackageDetailScreen({ route, navigation }: any) {
  const { package: pkg } = route.params;
  const [currentPackage, setCurrentPackage] = useState<Package>(pkg);
  const [updating, setUpdating] = useState(false);
  
  // 新增状态
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

      // 启动相机
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // 降低质量以提高性能
        exif: false, // 禁用EXIF数据以提高性能
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

  // 上传照片功能
  const handleUploadPhoto = async () => {
    if (!capturedPhoto) {
      Alert.alert('提示', '请先拍照');
      return;
    }

    try {
      setUploadingPhoto(true);

      // 获取位置权限
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        Alert.alert('权限不足', '需要位置权限才能记录配送位置');
        setUploadingPhoto(false);
        return;
      }

      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 1,
      });
      const { latitude, longitude } = location.coords;

      // 保存照片到相册（异步执行，不阻塞主流程）
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (mediaPermission.status === 'granted') {
        MediaLibrary.saveToLibraryAsync(capturedPhoto).catch(error => {
          console.log('保存到相册失败:', error);
        });
      }

      // 获取当前骑手信息
      const userName = await AsyncStorage.getItem('currentUserName') || '未知骑手';

      // 更新包裹状态为"已送达"并记录店铺信息
      const success = await packageService.updatePackageStatus(
        currentPackage.id,
        '已送达',
        undefined, // pickupTime
        new Date().toISOString(), // deliveryTime
        userName // courierName
      );

      if (success) {
        // 记录配送证明
        const deliveryProof = {
          packageId: currentPackage.id,
          photoUri: capturedPhoto,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          courier: userName,
        };

        console.log('配送证明记录:', deliveryProof);

        // 更新本地状态
        setCurrentPackage({ ...currentPackage, status: '已送达' });

        Alert.alert(
          '配送完成！',
          `包裹已成功送达\n📦 包裹编号：${currentPackage.id}\n📸 配送照片已保存\n📍 位置：${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n\n包裹状态已更新为"已送达"`,
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
        Alert.alert('照片上传成功', `配送证明已记录\n位置: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n但包裹状态更新失败，请手动更新`);
        setUploadingPhoto(false);
      }

    } catch (error) {
      console.error('上传照片失败:', error);
      Alert.alert('上传失败', '网络错误，请重试');
      setUploadingPhoto(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    const oldStatus = currentPackage.status;
    
    Alert.alert(
      '确认更新',
      `将包裹状态从「${oldStatus}」更新为「${newStatus}」？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
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
                  action_description: `移动端更新包裹状态：${oldStatus} → ${newStatus}`,
                  old_value: oldStatus,
                  new_value: newStatus
                });

                setCurrentPackage({ ...currentPackage, status: newStatus });
                Alert.alert('成功', '包裹状态已更新');
              } else {
                Alert.alert('失败', '状态更新失败，请重试');
              }
            } catch (error) {
              console.error('更新状态失败:', error);
              Alert.alert('失败', '网络错误，请检查连接');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>包裹详情</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 包裹编号和状态 */}
        <View style={styles.section}>
          <Text style={styles.packageId}>{currentPackage.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentPackage.status) }]}>
            <Text style={styles.statusText}>{currentPackage.status}</Text>
          </View>
        </View>

        {/* 收件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📍 收件信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>收件人</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>电话</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.receiver_address}</Text>
          </View>
        </View>

        {/* 寄件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📤 寄件信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>寄件人</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>电话</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.sender_address}</Text>
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📦 包裹信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>类型</Text>
            <Text style={styles.infoValue}>{currentPackage.package_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>重量</Text>
            <Text style={styles.infoValue}>{currentPackage.weight}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>价格</Text>
            <Text style={styles.infoValue}>{currentPackage.price}</Text>
          </View>
          {currentPackage.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>备注</Text>
              <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.description}</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionButtonText}>📞 拨打电话</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
            <Text style={styles.actionButtonText}>🗺️ 导航</Text>
          </TouchableOpacity>
        </View>

        {/* 新增功能按钮 */}
        <View style={styles.newActionsContainer}>
          <TouchableOpacity style={styles.newActionButton} onPress={handleShowAddress}>
            <Text style={styles.newActionButtonText}>📍 送货地址</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.newActionButton} onPress={() => navigation.navigate('ScanScreen', { packageId: currentPackage.id })}>
            <Text style={styles.newActionButtonText}>📱 扫码</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.newActionButton} onPress={() => setShowPhotoModal(true)}>
            <Text style={styles.newActionButtonText}>📸 上传照片</Text>
          </TouchableOpacity>
        </View>

        {/* 状态更新按钮 */}
        <View style={styles.statusUpdateContainer}>
          <Text style={styles.sectionTitle}>更新状态</Text>
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
                  <Text style={styles.statusUpdateText}>✓ 已取件</Text>
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
                  <Text style={styles.statusUpdateText}>🚚 配送中</Text>
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
                  <Text style={styles.statusUpdateText}>✓ 已送达</Text>
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
              <Text style={styles.modalTitle}>📍 送货地址</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>收件人：</Text>
              <Text style={styles.addressValue}>{currentPackage.receiver_name}</Text>
              
              <Text style={styles.addressLabel}>联系电话：</Text>
              <Text style={styles.addressValue}>{currentPackage.receiver_phone}</Text>
              
              <Text style={styles.addressLabel}>详细地址：</Text>
              <Text style={styles.addressDetail}>{currentPackage.receiver_address}</Text>
              
              <View style={styles.addressActions}>
                <TouchableOpacity style={styles.addressActionButton} onPress={handleCall}>
                  <Text style={styles.addressActionText}>📞 拨打电话</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addressActionButton} onPress={handleNavigate}>
                  <Text style={styles.addressActionText}>🗺️ 导航前往</Text>
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
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
});
