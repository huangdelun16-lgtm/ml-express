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

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  if (!permission) {
    return <View />;
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
    if (scanned) return;
    setScanned(true);
    await searchPackage(data);
  };

  const searchPackage = async (packageId: string) => {
    try {
      const packages = await packageService.getAllPackages();
      const foundPackage = packages.find(p => p.id === packageId);

      if (foundPackage) {
        Alert.alert(
          '找到包裹！',
          `包裹编号：${foundPackage.id}\n收件人：${foundPackage.receiver_name}`,
          [
            { text: '取消', onPress: () => setScanned(false) },
            {
              text: '查看详情',
              onPress: () => {
                navigation.navigate('PackageDetail', { package: foundPackage });
                setScanned(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('未找到', '该包裹不存在或未分配给你', [
          { text: '确定', onPress: () => setScanned(false) }
        ]);
      }
    } catch (error) {
      Alert.alert('错误', '查询包裹失败', [
        { text: '确定', onPress: () => setScanned(false) }
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
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
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

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              将包裹二维码对准扫描框
            </Text>
            {scanned && (
              <TouchableOpacity 
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
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
