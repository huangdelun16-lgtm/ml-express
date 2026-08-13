import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { packageService, Package } from '../services/supabase';
import { feedbackService } from '../services/feedbackService';

interface ScannerScreenProps {
  visible: boolean;
  onClose: () => void;
  onPackageFound: (packageData: Package) => void;
}

export default function ScannerScreen({ visible, onClose, onPackageFound }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    if (visible && (!permission || !permission.granted)) {
      requestPermission();
    }
    if (visible) {
      setScanned(false);
      setManualInput('');
    }
  }, [visible, permission]);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    try {
      await searchPackage(result.data);
    } catch (error) {
      console.error('扫码处理失败:', error);
      feedbackService.notify('错误', '扫码处理失败，请重试');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const searchPackage = async (packageId: string) => {
    try {
      // 获取所有包裹并查找匹配的
      const allPackages = await packageService.getAllPackages();
      const foundPackage = allPackages.find(pkg => 
        pkg.id.toLowerCase().includes(packageId.toLowerCase()) ||
        packageId.toLowerCase().includes(pkg.id.toLowerCase())
      );

      if (foundPackage) {
        Alert.alert(
          '找到包裹！',
          `包裹ID: ${foundPackage.id}\n收件人: ${foundPackage.receiver_name}\n状态: ${foundPackage.status}`,
          [
            {
              text: '查看详情',
              onPress: () => {
                onPackageFound(foundPackage);
                onClose();
              }
            },
            {
              text: '继续扫码',
              onPress: () => setScanned(false)
            }
          ]
        );
      } else {
        Alert.alert(
          '未找到包裹',
          `扫描的ID: ${packageId}\n\n未找到匹配的包裹，请检查包裹ID是否正确。`,
          [
            {
              text: '继续扫码',
              onPress: () => setScanned(false)
            },
            {
              text: '手动输入',
              onPress: () => setShowManualInput(true)
            }
          ]
        );
      }
    } catch (error) {
      console.error('搜索包裹失败:', error);
      feedbackService.notify('搜索失败', '网络错误，请检查连接后重试');
      setScanned(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      feedbackService.notify('提示', '请输入包裹ID');
      return;
    }

    setLoading(true);
    try {
      await searchPackage(manualInput.trim());
      setShowManualInput(false);
      setManualInput('');
    } catch (error) {
      console.error('手动搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.message}>请求摄像头权限中...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.message}>需要摄像头权限才能扫描二维码</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>授予权限</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]} onPress={onClose}>
            <Text style={styles.buttonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📱 扫描包裹</Text>
          <TouchableOpacity 
            onPress={() => setShowManualInput(true)} 
            style={styles.manualButton}
          >
            <Text style={styles.manualButtonText}>手动</Text>
          </TouchableOpacity>
        </View>

        {/* 摄像头视图 */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
            }}
          />
          {/* 🚀 优化布局：使用绝对定位覆盖层，提高启动速度和稳定性 */}
          <View style={styles.overlayContainer}>
            <View style={styles.overlay}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.middleContainer}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.focusedContainer}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                  </View>
                </View>
                <View style={styles.unfocusedContainer}></View>
              </View>
              <View style={styles.unfocusedContainer}></View>
            </View>
          </View>
        </View>

        {/* 底部信息 */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>
            {loading ? '🔍 搜索中...' : scanned ? '✅ 已扫描' : '📸 对准包裹上的二维码或条形码'}
          </Text>
          <Text style={styles.infoSubtitle}>
            {loading 
              ? '正在查找包裹信息' 
              : scanned 
                ? '点击继续扫码按钮继续扫描' 
                : '将摄像头对准包裹标签进行扫描'
            }
          </Text>
          
          {scanned && !loading && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>继续扫码</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 手动输入模态框 */}
        <Modal
          visible={showManualInput}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowManualInput(false)}
        >
          <View style={styles.centeredModalOverlay}>
            <View style={styles.centeredModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>手动输入包裹ID</Text>
                <TouchableOpacity
                  onPress={() => setShowManualInput(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="请输入包裹ID..."
                  value={manualInput}
                  onChangeText={setManualInput}
                  autoCapitalize="characters"
                  autoFocus={true}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.searchButton]}
                  onPress={handleManualSearch}
                  disabled={loading}
                >
                  <Text style={styles.searchButtonText}>
                    {loading ? '搜索中...' : '搜索'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(44, 82, 130, 0.9)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.5,
  },
  focusedContainer: {
    flex: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  infoContainer: {
    backgroundColor: 'rgba(44, 82, 130, 0.9)',
    padding: 20,
    alignItems: 'center',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  rescanButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centeredModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: '#2c5282',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
