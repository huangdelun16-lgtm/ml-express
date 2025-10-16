import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { packageService, Package, supabase, deliveryPhotoService, geofenceService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }: any) {
  const { language } = useApp();
  const [location, setLocation] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeliveringPackageId, setCurrentDeliveringPackageId] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [optimizedPackagesWithCoords, setOptimizedPackagesWithCoords] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);
  
  // 拍照相关状态
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPackageForDelivery, setCurrentPackageForDelivery] = useState<Package | null>(null);

  useEffect(() => {
    requestLocationPermission();
    loadPackages();
    loadCurrentDeliveringPackage();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限才能使用导航功能');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
      const myPackages = allPackages.filter(pkg => 
        pkg.courier === currentUser && 
        !['已送达', '已取消'].includes(pkg.status)
      );
      
      setPackages(myPackages);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🚚 加载当前正在配送的包裹ID
  const loadCurrentDeliveringPackage = async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      const { data, error } = await supabase
        .from('couriers')
        .select('current_delivering_package_id')
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('加载当前配送包裹失败:', error);
        return;
      }

      setCurrentDeliveringPackageId(data?.current_delivering_package_id || null);
    } catch (error) {
      console.error('加载当前配送包裹异常:', error);
    }
  };

  // 🚀 开始配送此包裹
  const startDelivering = async (packageId: string) => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) {
        Alert.alert('错误', '未找到快递员ID，请重新登录');
        return;
      }

      // 更新数据库中骑手的当前配送包裹ID
      const { error } = await supabase
        .from('couriers')
        .update({ current_delivering_package_id: packageId })
        .eq('id', courierId);

      if (error) {
        console.error('更新当前配送包裹失败:', error);
        Alert.alert('错误', '开始配送失败，请重试');
        return;
      }

      // 更新包裹状态为"配送中"
      await packageService.updatePackageStatus(
        packageId,
        '配送中',
        new Date().toLocaleString('zh-CN')
      );

      setCurrentDeliveringPackageId(packageId);
      Alert.alert(
        '✅ 开始配送',
        '您已开始配送此包裹，客户现在可以实时跟踪您的位置',
        [{ text: '确定' }]
      );

      // 刷新包裹列表
      loadPackages();
    } catch (error) {
      console.error('开始配送异常:', error);
      Alert.alert('错误', '开始配送失败，请重试');
    }
  };

  // 🏁 完成配送此包裹（自动拍照）
  const finishDelivering = async (packageId: string) => {
    try {
      // 找到要完成配送的包裹
      const packageToDeliver = packages.find(pkg => pkg.id === packageId);
      if (!packageToDeliver) {
        Alert.alert('错误', '未找到包裹信息');
        return;
      }

      // 设置当前要完成配送的包裹
      setCurrentPackageForDelivery(packageToDeliver);
      
      // 直接弹出拍照窗口
      setShowCameraModal(true);
      
    } catch (error) {
      console.error('完成配送异常:', error);
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  // 📸 打开相机拍照
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

  // 🔄 将图片转换为base64（优化版 - iOS流畅）
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

  // 📤 上传照片并完成配送
  const handleUploadPhoto = async () => {
    if (!capturedPhoto || !currentPackageForDelivery) {
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

          // 3秒超时
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('GPS获取超时')), 3000)
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
          packageId: currentPackageForDelivery.id,
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
        packageId: currentPackageForDelivery.id,
        status: '已送达',
        deliveryTime: new Date().toISOString(),
        courierName: userName
      });

      const success = await packageService.updatePackageStatus(
        currentPackageForDelivery.id,
        '已送达',
        undefined, // pickupTime
        new Date().toISOString(), // deliveryTime
        userName // courierName
      );

      console.log('包裹状态更新结果:', success);

      if (success) {
        // 6. 清除当前配送包裹ID
        const courierId = await AsyncStorage.getItem('currentCourierId');
        if (courierId) {
          const { error } = await supabase
            .from('couriers')
            .update({ current_delivering_package_id: null })
            .eq('id', courierId);

          if (error) {
            console.error('清除当前配送包裹失败:', error);
          }
        }

        setCurrentDeliveringPackageId(null);

        // 记录配送证明
        const deliveryProof = {
          packageId: currentPackageForDelivery.id,
          photoUri: capturedPhoto,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          courier: userName,
          photoUploaded: photoSaved
        };

        console.log('配送证明记录:', deliveryProof);

        // 生成详细的成功消息
        let successMessage = `包裹已成功送达\n\n📦 包裹编号：${currentPackageForDelivery.id}\n👤 骑手：${userName}\n📍 位置：${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n`;
        
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
                setCurrentPackageForDelivery(null);
                // 刷新包裹列表
                loadPackages();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '⚠️ 部分成功', 
          `配送照片${photoSaved ? '已上传' : '已保存到本地'}\n位置: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n⚠️ 但包裹状态更新失败，请稍后重试`,
          [
            {
              text: '确定',
              onPress: () => {
                setUploadingPhoto(false);
                setShowPhotoModal(false);
                setCapturedPhoto(null);
                setCurrentPackageForDelivery(null);
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

  // 导航到单个地址
  const handleNavigate = (address: string) => {
    if (!location) {
      Alert.alert('提示', '正在获取您的位置，请稍后再试');
      return;
    }

    // 使用 Google Maps Directions 从当前位置导航到目标地址
    const origin = `${location.latitude},${location.longitude}`;
    const destination = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    Linking.openURL(url);
  };

  // 🧮 计算两点之间的直线距离（哈弗辛公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🗺️ 解析地址中的坐标（如果有）或使用简单的地址匹配
  const parseCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // 1. 尝试从地址中提取坐标（某些系统会在地址中包含坐标）
    const coordMatch = address.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
    if (coordMatch) {
      const coords = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
      console.log(`✅ 从地址中提取坐标: ${address} → ${coords.lat}, ${coords.lng}`);
      return coords;
    }

    // 2. 检查包裹数据中是否已有坐标（receiver_latitude, receiver_longitude）
    const pkg = packages.find(p => p.receiver_address === address);
    if (pkg && pkg.receiver_latitude && pkg.receiver_longitude) {
      const coords = {
        lat: parseFloat(pkg.receiver_latitude.toString()),
        lng: parseFloat(pkg.receiver_longitude.toString())
      };
      console.log(`✅ 从包裹数据中读取坐标: ${address} → ${coords.lat}, ${coords.lng}`);
      return coords;
    }

    // 3. 使用简单的地址关键词匹配（曼德勒常见地点）
    const mandalayLocations: { [key: string]: { lat: number; lng: number } } = {
      '曼德勒市中心': { lat: 21.9588, lng: 96.0891 },
      '曼德勒中心': { lat: 21.9588, lng: 96.0891 },
      '市中心': { lat: 21.9588, lng: 96.0891 },
      'Mandalay': { lat: 21.9588, lng: 96.0891 },
      '曼德勒大学': { lat: 21.9688, lng: 96.0991 },
      '大学': { lat: 21.9688, lng: 96.0991 },
      'University': { lat: 21.9688, lng: 96.0991 },
      '茵雅湖': { lat: 21.9488, lng: 96.0791 },
      'Inya Lake': { lat: 21.9488, lng: 96.0791 },
      '66街': { lat: 21.9650, lng: 96.0850 },
      '66th Street': { lat: 21.9650, lng: 96.0850 },
      '67街': { lat: 21.9660, lng: 96.0860 },
      '67th Street': { lat: 21.9660, lng: 96.0860 },
      '87街': { lat: 21.9700, lng: 96.0900 },
      '87th Street': { lat: 21.9700, lng: 96.0900 },
      'Aungmyaythazan': { lat: 21.9550, lng: 96.1000 },
      'Chanayethazan': { lat: 21.9600, lng: 96.0950 },
    };

    // 尝试匹配关键词
    const addressLower = address.toLowerCase();
    for (const [keyword, coords] of Object.entries(mandalayLocations)) {
      if (addressLower.includes(keyword.toLowerCase())) {
        console.log(`✅ 关键词匹配: ${address} → ${keyword} (${coords.lat}, ${coords.lng})`);
        // 添加小的随机偏移，避免所有包裹在同一位置
        const randomOffset = () => (Math.random() - 0.5) * 0.01; // ±0.005度偏移（约500米）
        return {
          lat: coords.lat + randomOffset(),
          lng: coords.lng + randomOffset()
        };
      }
    }

    // 4. 如果都无法匹配，使用曼德勒默认位置（带随机偏移）
    console.warn(`⚠️ 无法解析地址坐标，使用默认位置: ${address}`);
    const randomOffset = () => (Math.random() - 0.5) * 0.02; // ±0.01度偏移（约1公里）
    return {
      lat: 21.9588 + randomOffset(),
      lng: 96.0891 + randomOffset()
    };
  };

  // 🎯 智能路线优化算法（贪心 + 优先级）
  const optimizeDeliveryRoute = async (packagesList: Package[]): Promise<Package[]> => {
    if (!location || packagesList.length <= 1) {
      return packagesList;
    }

    try {
      // 1. 为每个包裹计算坐标和距离
      const packagesWithCoords = await Promise.all(
        packagesList.map(async (pkg) => {
          const coords = await parseCoordinatesFromAddress(pkg.receiver_address);
          let distance = null;
          
          if (coords) {
            distance = calculateDistance(location.latitude, location.longitude, coords.lat, coords.lng);
          } else {
            console.warn(`⚠️ 无法解析地址: ${pkg.receiver_address}`);
          }
          
          // 计算优先级分数（越小越优先）
          // 如果无法获取坐标，设置为最远（999）用于排序，但不显示
          let priorityScore = distance !== null ? distance : 999;
          
          // 急送达优先级最高（减少50%距离权重）
          if (pkg.delivery_speed === '急送达') {
            priorityScore *= 0.5;
          }
          // 定时达根据时间紧迫度调整
          else if (pkg.delivery_speed === '定时达' && pkg.scheduled_delivery_time) {
            const scheduledTime = new Date(pkg.scheduled_delivery_time).getTime();
            const currentTime = new Date().getTime();
            const timeLeft = scheduledTime - currentTime;
            const hoursLeft = timeLeft / (1000 * 60 * 60);
            
            // 如果剩余时间少于1小时，优先级提高
            if (hoursLeft < 1) {
              priorityScore *= 0.3;
            } else if (hoursLeft < 2) {
              priorityScore *= 0.6;
            }
          }

          return {
            ...pkg,
            coords,
            distance,
            priorityScore
          };
        })
      );

      // 2. 按优先级排序（距离近 + 紧急程度高的优先）
      const sortedPackages = packagesWithCoords.sort((a, b) => {
        return a.priorityScore - b.priorityScore;
      });

      // 3. 使用贪心算法进一步优化路线（最近邻算法）
      const optimizedRoute: Package[] = [];
      const remaining = [...sortedPackages];
      let currentLat = location.latitude;
      let currentLng = location.longitude;

      while (remaining.length > 0) {
        // 找到距离当前位置最近的包裹
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const pkg = remaining[i];
          if (pkg.coords) {
            const dist = calculateDistance(currentLat, currentLng, pkg.coords.lat, pkg.coords.lng);
            // 考虑优先级：急送达的包裹即使稍远也可能被选中
            const adjustedDist = pkg.delivery_speed === '急送达' ? dist * 0.7 : dist;
            
            if (adjustedDist < nearestDistance) {
              nearestDistance = adjustedDist;
              nearestIndex = i;
            }
          }
        }

        // 将最近的包裹加入路线
        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimizedRoute.push(nearest);
        
        // 更新当前位置
        if (nearest.coords) {
          currentLat = nearest.coords.lat;
          currentLng = nearest.coords.lng;
        }
      }

      console.log('🎯 路线优化完成:', optimizedRoute.map(p => `${p.id} (${p.distance?.toFixed(2)}km, 优先级:${p.priorityScore?.toFixed(2)})`));
      
      return optimizedRoute;
    } catch (error) {
      console.error('路线优化失败:', error);
      // 如果优化失败，返回原始列表
      return packagesList;
    }
  };

  // 导航到所有包裹地址（智能优化路线 + 地图预览）
  const handleNavigateAll = async () => {
    if (packages.length === 0) {
      Alert.alert('提示', '暂无待配送包裹');
      return;
    }

    if (!location) {
      Alert.alert('提示', '正在获取您的位置，请稍后再试');
      return;
    }

    // 显示加载提示
    Alert.alert('🔄 路线规划中...', '正在为您优化最佳配送路线，请稍候');

    try {
      // 1. 智能优化路线
      const optimizedPackages = await optimizeDeliveryRoute(packages);
      
      // 2. 更新包裹列表显示（按优化后的顺序）
      setPackages(optimizedPackages);

      // 3. 保存带坐标的优化包裹数据
      setOptimizedPackagesWithCoords(optimizedPackages);

      // 4. 显示地图预览（带数字标记 1,2,3,4）
      setShowMapPreview(true);
    } catch (error) {
      console.error('路线规划失败:', error);
      Alert.alert('错误', '路线规划失败，请重试');
    }
  };

  // 🚀 跳转到Google Maps导航
  const openGoogleMapsNavigation = async () => {
    if (!location || optimizedPackagesWithCoords.length === 0) return;

    try {
      const origin = `${location.latitude},${location.longitude}`;
      
      if (optimizedPackagesWithCoords.length === 1) {
        // 单个包裹导航
        const pkg = optimizedPackagesWithCoords[0];
        const destination = pkg.coords 
          ? `${pkg.coords.lat},${pkg.coords.lng}`
          : encodeURIComponent(pkg.receiver_address);
        
        // 尝试多种URL方案，确保iOS和Android都能正常工作
        const urls = [
          `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`, // Google Maps App (iOS/Android)
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`, // Web fallback
        ];
        
        // 尝试打开Google Maps应用，失败则使用浏览器
        let opened = false;
        for (const url of urls) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            break;
          }
        }
        
        if (!opened) {
          // 如果都失败，使用Apple Maps作为iOS备选
          const appleMapsUrl = `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
          await Linking.openURL(appleMapsUrl);
        }
      } else {
        // 多个包裹导航 - 使用坐标而不是地址
        const allCoords = optimizedPackagesWithCoords
          .filter(pkg => pkg.coords)
          .map(pkg => `${pkg.coords.lat},${pkg.coords.lng}`);
        
        if (allCoords.length === 0) {
          Alert.alert('错误', '无法获取包裹位置坐标，请检查地址设置');
          return;
        }
        
        const destination = allCoords[allCoords.length - 1];
        const waypointsLimit = Math.min(allCoords.length - 1, 9); // Google Maps最多支持9个途经点
        const waypoints = allCoords.slice(0, waypointsLimit).join('|');
        
        // 尝试多种URL方案
        const urls = [
          `comgooglemaps://?saddr=${origin}&daddr=${destination}&waypoints=${waypoints}&directionsmode=driving`, // Google Maps App
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, // Web
        ];
        
        let opened = false;
        for (const url of urls) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            break;
          }
        }
        
        if (!opened) {
          // iOS备选：Apple Maps（但Apple Maps不支持多途经点，所以只导航到最后一个地址）
          Alert.alert(
            '提示', 
            'iOS系统不支持多途经点导航，将只导航到最后一个地址。建议安装Google Maps应用以获得完整路线。',
            [
              {
                text: '取消',
                style: 'cancel'
              },
              {
                text: '继续',
                onPress: async () => {
                  const appleMapsUrl = `http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
                  await Linking.openURL(appleMapsUrl);
                }
              }
            ]
          );
        }
      }
      
      // 关闭地图预览
      setShowMapPreview(false);
    } catch (error) {
      console.error('打开导航失败:', error);
      Alert.alert('错误', '无法打开导航应用，请确保已安装Google Maps或Apple Maps');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const renderPackageItem = ({ item, index }: { item: Package, index: number }) => {
    // 显示距离信息（如果有且有效）
    const itemDistance = (item as any).distance;
    const distanceText = itemDistance !== null && itemDistance !== undefined && itemDistance !== 999
      ? `📏 ${itemDistance.toFixed(1)}km` 
      : '';
    
    // 显示配送速度图标
    const speedIcon = item.delivery_speed === '急送达' ? '⚡' : 
                     item.delivery_speed === '定时达' ? '⏰' : '✓';
    
    // 判断是否为当前配送的包裹
    const isCurrentDelivering = currentDeliveringPackageId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard,
          isCurrentDelivering && styles.currentDeliveringCard
        ]}
        onPress={() => navigation.navigate('PackageDetail', { package: item })}
      >
        <View style={[styles.numberBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
        
        <View style={styles.packageInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.packageId}>{item.id}</Text>
            {item.delivery_speed && (
              <View style={styles.speedBadge}>
                <Text style={styles.speedIcon}>{speedIcon}</Text>
                <Text style={styles.speedText}>{item.delivery_speed}</Text>
              </View>
            )}
            {isCurrentDelivering && (
              <View style={styles.deliveringBadge}>
                <Text style={styles.deliveringText}>🚚 配送中</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.receiverName}>📍 {item.receiver_name}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.receiver_address}</Text>
          
          <View style={styles.packageMeta}>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.packageType}>{item.package_type} · {item.weight}</Text>
            {distanceText && (
              <Text style={styles.distanceText}>{distanceText}</Text>
            )}
          </View>

          {/* 开始/结束配送按钮 */}
          {item.status === '已取件' || item.status === '配送中' ? (
            <View style={styles.deliveryActions}>
              {!isCurrentDelivering ? (
                <TouchableOpacity 
                  style={styles.startDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    startDelivering(item.id);
                  }}
                >
                  <Text style={styles.startDeliveryText}>
                    🚀 {language === 'zh' ? '开始配送' : language === 'en' ? 'Start Delivery' : 'ပို့ဆောင်မှုစတင်'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.finishDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    finishDelivering(item.id);
                  }}
                >
                  <Text style={styles.finishDeliveryText}>
                    🏁 {language === 'zh' ? '完成配送' : language === 'en' ? 'Complete Delivery' : 'ပို့ဆောင်မှုပြီးမြောက်'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={(e) => {
            e.stopPropagation();
            handleNavigate(item.receiver_address);
          }}
        >
          <Text style={styles.navButtonText}>🗺️</Text>
          <Text style={styles.navButtonLabel}>
            {language === 'zh' ? '导航' : language === 'en' ? 'Navigate' : 'လမ်းညွှန်'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🗺️ {language === 'zh' ? '配送路线' : language === 'en' ? 'Delivery Route' : 'ပို့ဆောင်လမ်းကြောင်း'}
        </Text>
        <TouchableOpacity onPress={loadPackages} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            {language !== 'my' && (
              <>
                <Text style={styles.locationTitle}>
                  {language === 'zh' ? '我的位置' : 'My Location'}
                </Text>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.navigateAllButton, packages.length === 0 && styles.navigateAllButtonDisabled]}
            onPress={handleNavigateAll}
            disabled={packages.length === 0}
          >
            <Text style={styles.navigateAllIcon}>🧭</Text>
            <Text style={styles.navigateAllText}>
              {packages.length > 0 
                ? (language === 'zh' ? `规划路线 (${packages.length}站)` : language === 'en' ? `Plan Route (${packages.length} stops)` : `လမ်းကြောင်းစီစဉ် (${packages.length} ဂိတ်)`)
                : (language === 'zh' ? '暂无任务' : language === 'en' ? 'No Tasks' : 'တာဝန်မရှိ')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          📦 {language === 'zh' ? `配送顺序 (${packages.length})` : language === 'en' ? `Delivery Order (${packages.length})` : `ပို့ဆောင်မည့်အစဉ် (${packages.length})`}
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2c5282" />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>暂无待配送包裹</Text>
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* 🗺️ 地图预览Modal（显示数字标记 1,2,3,4） */}
      <Modal
        visible={showMapPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMapPreview(false)}
      >
        <View style={styles.mapModalContainer}>
          {/* 地图标题栏 */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowMapPreview(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>📍 配送路线预览</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 地图视图 */}
          {location && optimizedPackagesWithCoords.length > 0 && (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {/* 骑手当前位置标记（绿色圆点） */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="我的位置"
                description="骑手当前位置"
              >
                <View style={styles.courierMarker}>
                  <Text style={styles.courierMarkerText}>🏍️</Text>
                </View>
              </Marker>

              {/* 包裹目的地标记（数字 1,2,3,4） */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.coords) return null;
                return (
                  <Marker
                    key={pkg.id}
                    coordinate={{
                      latitude: pkg.coords.lat,
                      longitude: pkg.coords.lng,
                    }}
                    title={`${index + 1}. ${pkg.receiver_name}`}
                    description={pkg.receiver_address}
                  >
                    <View style={styles.packageMarker}>
                      <Text style={styles.packageMarkerNumber}>{index + 1}</Text>
                    </View>
                  </Marker>
                );
              })}

              {/* 路线连线 */}
              {location && optimizedPackagesWithCoords.length > 0 && (
                <Polyline
                  coordinates={[
                    { latitude: location.latitude, longitude: location.longitude },
                    ...optimizedPackagesWithCoords
                      .filter((pkg: any) => pkg.coords)
                      .map((pkg: any) => ({
                        latitude: pkg.coords.lat,
                        longitude: pkg.coords.lng,
                      })),
                  ]}
                  strokeColor="#3182ce"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
          )}

          {/* 底部操作按钮 */}
          <View style={styles.mapModalFooter}>
            <TouchableOpacity 
              style={styles.startNavigationButton}
              onPress={openGoogleMapsNavigation}
            >
              <Text style={styles.startNavigationText}>
                🚀 {language === 'zh' ? '开始导航' : language === 'en' ? 'Start Navigation' : 'လမ်းညွှန်စတင်ရန်'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 配送顺序列表 */}
          <View style={styles.routeList}>
            <Text style={styles.routeListTitle}>
              {language === 'zh' ? '配送顺序：' : language === 'en' ? 'Delivery Order:' : 'ပို့ဆောင်မည့်အစဉ်:'}
            </Text>
            {optimizedPackagesWithCoords.map((pkg: any, index: number) => (
              <View key={pkg.id} style={styles.routeListItem}>
                <View style={styles.routeNumber}>
                  <Text style={styles.routeNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{pkg.receiver_name}</Text>
                  <Text style={styles.routeDistance}>
                    {pkg.distance !== null && pkg.distance !== 999
                      ? `📏 ${pkg.distance.toFixed(1)}km`
                      : '📍 地址待确认'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* 📸 拍照Modal */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.cameraModalContainer}>
          <View style={styles.cameraModalContent}>
            <View style={styles.cameraModalHeader}>
              <Text style={styles.cameraModalTitle}>
                📸 {language === 'zh' ? '拍摄配送照片' : language === 'en' ? 'Take Delivery Photo' : 'ပို့ဆောင်ရေးဓာတ်ပုံရိုက်ပါ'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCameraModal(false)}
                style={styles.cameraModalCloseButton}
              >
                <Text style={styles.cameraModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraModalBody}>
              <Text style={styles.cameraModalDescription}>
                {language === 'zh' ? '请拍摄包裹送达照片作为配送证明' : language === 'en' ? 'Please take a photo of the delivered package as proof' : 'ပို့ဆောင်ပြီးသားပက်ကေ့ဂျ်ဓာတ်ပုံကို သက်သေအဖြစ် ရိုက်ပါ'}
              </Text>
              
              <TouchableOpacity
                onPress={handleOpenCamera}
                style={styles.cameraButton}
              >
                <Text style={styles.cameraButtonText}>
                  📷 {language === 'zh' ? '打开相机' : language === 'en' ? 'Open Camera' : 'ကင်မရာဖွင့်ပါ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📷 照片预览Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.photoModalContainer}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                📷 {language === 'zh' ? '配送照片预览' : language === 'en' ? 'Delivery Photo Preview' : 'ပို့ဆောင်ရေးဓာတ်ပုံအစမ်းကြည့်ရန်'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPhotoModal(false);
                  setCapturedPhoto(null);
                  setCurrentPackageForDelivery(null);
                }}
                style={styles.photoModalCloseButton}
              >
                <Text style={styles.photoModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoModalBody}>
              {capturedPhoto && (
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
              )}
              
              <View style={styles.photoModalActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPhotoModal(false);
                    setCapturedPhoto(null);
                    setShowCameraModal(true);
                  }}
                  style={styles.retakeButton}
                >
                  <Text style={styles.retakeButtonText}>
                    🔄 {language === 'zh' ? '重新拍照' : language === 'en' ? 'Retake' : 'ပြန်ရိုက်ပါ'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  style={[styles.uploadButton, uploadingPhoto && styles.uploadButtonDisabled]}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.uploadButtonText}>
                      📤 {language === 'zh' ? '上传并完成配送' : language === 'en' ? 'Upload & Complete' : 'တင်ပြီး ပြီးမြောက်ပါ'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
  refreshButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 20,
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  navigateAllButton: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navigateAllButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  navigateAllIcon: {
    fontSize: 16,
  },
  navigateAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  packageInfo: {
    flex: 1,
  },
  packageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  receiverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  packageType: {
    fontSize: 12,
    color: '#999',
  },
  speedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    gap: 4,
  },
  speedIcon: {
    fontSize: 12,
  },
  speedText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  currentDeliveringCard: {
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  deliveringBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deliveringText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  deliveryActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  startDeliveryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  startDeliveryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishDeliveryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  finishDeliveryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3182ce',
    borderRadius: 12,
    paddingVertical: 10,
  },
  navButtonText: {
    fontSize: 24,
  },
  navButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
  // 🗺️ 地图预览Modal样式
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapModalHeader: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mapModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    width: width,
    height: height * 0.5,
  },
  courierMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 20,
  },
  packageMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  packageMarkerNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapModalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startNavigationButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startNavigationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeList: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 16,
  },
  routeListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  routeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  routeDistance: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  // 拍照Modal样式
  cameraModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cameraModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cameraModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraModalCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  cameraModalBody: {
    padding: 20,
  },
  cameraModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  cameraButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 照片预览Modal样式
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  photoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  photoModalBody: {
    padding: 20,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
  },
  photoModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flex: 2,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});