import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Camera, BarCodeScannedEvent } from 'expo-camera';
import { packageService, Package } from '../services/supabase';
import { useLanguage } from '../contexts/AppContext';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedPackage, setScannedPackage] = useState<Package | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
    setScanned(false);
    setManualInput('');
  }, []);

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannedEvent) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    try {
      await searchPackage(data);
    } catch (error) {
      console.error('扫码处理失败:', error);
      Alert.alert(
        language === 'zh' ? '错误' : 'Error',
        language === 'zh' ? '扫码处理失败，请重试' : 'Scan processing failed, please try again'
      );
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const searchPackage = async (packageId: string) => {
    try {
      const packageData = await packageService.getPackageById(packageId);
      
      if (packageData) {
        setScannedPackage(packageData);
        Alert.alert(
          language === 'zh' ? '包裹找到' : 'Package Found',
          language === 'zh' 
            ? `包裹ID: ${packageData.id}\n收件人: ${packageData.receiver_name}\n状态: ${packageData.status}`
            : `Package ID: ${packageData.id}\nReceiver: ${packageData.receiver_name}\nStatus: ${packageData.status}`,
          [
            {
              text: language === 'zh' ? '确定' : 'OK',
              onPress: () => {
                setScannedPackage(null);
                setScanned(false);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          language === 'zh' ? '未找到包裹' : 'Package Not Found',
          language === 'zh' ? '未找到该包裹，请检查包裹ID' : 'Package not found, please check package ID',
          [
            {
              text: language === 'zh' ? '确定' : 'OK',
              onPress: () => setScanned(false)
            }
          ]
        );
      }
    } catch (error) {
      console.error('搜索包裹失败:', error);
      Alert.alert(
        language === 'zh' ? '搜索失败' : 'Search Failed',
        language === 'zh' ? '搜索包裹失败，请重试' : 'Failed to search package, please try again',
        [
          {
            text: language === 'zh' ? '确定' : 'OK',
            onPress: () => setScanned(false)
          }
        ]
      );
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      Alert.alert(
        language === 'zh' ? '输入错误' : 'Input Error',
        language === 'zh' ? '请输入包裹ID' : 'Please enter package ID'
      );
      return;
    }

    setLoading(true);
    try {
      await searchPackage(manualInput.trim());
    } catch (error) {
      console.error('手动搜索失败:', error);
      Alert.alert(
        language === 'zh' ? '搜索失败' : 'Search Failed',
        language === 'zh' ? '搜索包裹失败，请重试' : 'Failed to search package, please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedPackage(null);
    setManualInput('');
    setShowManualInput(false);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2c5282" />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            {language === 'zh' ? '请求相机权限...' : 'Requesting camera permission...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2c5282" />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            {language === 'zh' ? '需要相机权限来扫描二维码' : 'Camera permission is required to scan QR codes'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>
              {language === 'zh' ? '授权相机' : 'Grant Camera Permission'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c5282" />
      
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          📱 {language === 'zh' ? '扫码管理' : 'Scanner Management'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'zh' ? '扫描包裹二维码或手动输入' : 'Scan package QR code or manual input'}
        </Text>
      </View>

      {/* 相机视图 */}
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
          }}
        >
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                {language === 'zh' ? '处理中...' : 'Processing...'}
              </Text>
            </View>
          )}
          
          {scanned && !loading && (
            <View style={styles.scannedOverlay}>
              <Text style={styles.scannedText}>
                ✅ {language === 'zh' ? '已扫描' : 'Scanned'}
              </Text>
            </View>
          )}
        </Camera>
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={resetScanner}
          disabled={loading}
        >
          <Text style={styles.scanButtonText}>
            {language === 'zh' ? '重新扫描' : 'Scan Again'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setShowManualInput(true)}
          disabled={loading}
        >
          <Text style={styles.manualButtonText}>
            {language === 'zh' ? '手动输入' : 'Manual Input'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 手动输入模态框 */}
      <Modal
        visible={showManualInput}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'zh' ? '手动输入包裹ID' : 'Manual Package ID Input'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder={language === 'zh' ? '请输入包裹ID' : 'Enter package ID'}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => {
                  setShowManualInput(false);
                  handleManualSearch();
                }}
                disabled={loading}
              >
                <Text style={styles.searchButtonText}>
                  {language === 'zh' ? '搜索' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c5282',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});