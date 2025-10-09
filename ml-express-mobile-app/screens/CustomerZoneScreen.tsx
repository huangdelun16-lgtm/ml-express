import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { packageService, auditLogService, userService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

export default function CustomerZoneScreen({ navigation }: any) {
  const { t, theme, updateSettings, language } = useApp();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [downloading, setDownloading] = useState(false);
  
  // 地图相关状态
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapType, setMapType] = useState<'sender' | 'receiver'>('sender');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 16.8661, // 仰光中心
    longitude: 96.1951,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // 下单表单
  const [orderForm, setOrderForm] = useState({
    // 寄件人信息
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    
    // 收件人信息
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    
    // 包裹信息
    packageType: '文件',
    weight: '',
    description: '',
    
    // 联系信息
    customerPhone: '',
    customerName: '',
  });

  const resetOrderForm = () => {
    setOrderForm({
      senderName: '',
      senderPhone: '',
      senderAddress: '',
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      packageType: '文件',
      weight: '',
      description: '',
      customerPhone: '',
      customerName: '',
    });
  };

  // 计算价格（简化版）
  const calculatePrice = () => {
    let basePrice = 1500; // 基础价格
    const weight = parseFloat(orderForm.weight) || 1;
    
    if (weight > 5) {
      basePrice += (weight - 5) * 200; // 超重费
    }
    
    if (orderForm.packageType === '易碎品') {
      basePrice += 500; // 易碎品附加费
    }
    
    return basePrice;
  };

  // 打开地图选择
  const openMapSelector = (type: 'sender' | 'receiver') => {
    setMapType(type);
    setShowMapModal(true);
    setSelectedLocation(null);
  };

  // 获取当前位置
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.locationPermissionDenied, t.locationPermissionMessage);
        return;
      }

      // 使用更高精度的位置获取设置
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation, // 使用最高精度
        timeInterval: 1000, // 1秒间隔
        distanceInterval: 1, // 1米间隔
      });
      
      const { latitude, longitude, accuracy } = currentLocation.coords;
      
      // 检查位置精度，如果精度太差则提示用户
      if (accuracy && accuracy > 100) {
        Alert.alert(
          '位置精度较低', 
          `当前位置精度为 ${accuracy.toFixed(0)} 米，可能不够准确。建议在开阔区域重新获取位置。`,
          [
            { text: '重新获取', onPress: () => getCurrentLocation() },
            { text: '使用当前位置', onPress: () => confirmLocation() }
          ]
        );
      }
      
      setMapRegion(prev => ({
        ...prev,
        latitude,
        longitude,
        latitudeDelta: 0.01, // 缩小地图范围以显示更精确的位置
        longitudeDelta: 0.01,
      }));

      // 设置当前位置为选中位置
      setSelectedLocation({
        latitude,
        longitude,
        address: language === 'zh' 
          ? `当前位置: 纬度 ${latitude.toFixed(6)}, 经度 ${longitude.toFixed(6)} (精度: ${accuracy?.toFixed(0)}米)`
          : language === 'en'
          ? `Current Location: Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)} (Accuracy: ${accuracy?.toFixed(0)}m)`
          : `လက်ရှိတည်နေရာ: လတ္တီတွဒ် ${latitude.toFixed(6)}, လောင်ဂျီတွဒ် ${longitude.toFixed(6)} (တိကျမှု: ${accuracy?.toFixed(0)}မီတာ)`
      });

      Alert.alert(
        '位置获取成功', 
        `纬度: ${latitude.toFixed(6)}\n经度: ${longitude.toFixed(6)}\n精度: ${accuracy?.toFixed(0)}米`
      );

    } catch (error) {
      console.error('获取位置失败:', error);
      Alert.alert(t.getLocationFailed, t.getLocationErrorMessage);
    }
  };

  // 确认使用当前位置
  const confirmLocation = () => {
    if (selectedLocation) {
      if (mapType === 'sender') {
        setOrderForm(prev => ({
          ...prev,
          senderAddress: selectedLocation.address,
          senderLatitude: selectedLocation.latitude,
          senderLongitude: selectedLocation.longitude,
        }));
      } else {
        setOrderForm(prev => ({
          ...prev,
          receiverAddress: selectedLocation.address,
          receiverLatitude: selectedLocation.latitude,
          receiverLongitude: selectedLocation.longitude,
        }));
      }
      setShowMapModal(false);
    }
  };

  // 地图点击选择位置
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({
      latitude,
      longitude,
      address: language === 'zh' 
        ? `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`
        : language === 'en'
        ? `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
        : `လတ္တီတွဒ်: ${latitude.toFixed(6)}, လောင်ဂျီတွဒ်: ${longitude.toFixed(6)}`
    });
  };

  // 确认选择位置
  const confirmLocationSelection = () => {
    if (!selectedLocation) {
      Alert.alert(t.error, t.pleaseSelectLocation);
      return;
    }

    // 更新对应地址字段
    if (mapType === 'sender') {
      setOrderForm(prev => ({
        ...prev,
        senderAddress: selectedLocation.address
      }));
    } else {
      setOrderForm(prev => ({
        ...prev,
        receiverAddress: selectedLocation.address
      }));
    }

    setShowMapModal(false);
    Alert.alert(t.locationSelected, `${t.locationSelected}: ${selectedLocation.address}`);
  };

  // 生成缅甸时间格式的订单号
  const generateMyanmarOrderId = () => {
    const now = new Date();
    // 缅甸时间 (UTC+6:30)
    const myanmarTime = new Date(now.getTime() + (6.5 * 60 * 60 * 1000));
    
    const year = myanmarTime.getFullYear();
    const month = String(myanmarTime.getMonth() + 1).padStart(2, '0');
    const day = String(myanmarTime.getDate()).padStart(2, '0');
    const hour = String(myanmarTime.getHours()).padStart(2, '0');
    const minute = String(myanmarTime.getMinutes()).padStart(2, '0');
    const random1 = Math.floor(Math.random() * 10);
    const random2 = Math.floor(Math.random() * 10);
    
    return `MDY${year}${month}${day}${hour}${minute}${random1}${random2}`;
  };

  // 发送订单通知给客户
  const sendOrderNotification = async (orderId: string, customerPhone: string, customerName: string) => {
    try {
      // 这里可以集成短信服务或推送通知
      // 目前使用Alert模拟发送成功
      console.log(`📱 订单通知已发送给客户 ${customerName} (${customerPhone})`);
      console.log(`📦 订单号: ${orderId}`);
      
      // 记录通知日志
      await auditLogService.log({
        user_id: `customer_${customerPhone}`,
        user_name: customerName,
        action_type: 'notification',
        module: 'orders',
        target_id: orderId,
        target_name: `订单 ${orderId}`,
        action_description: `订单号 ${orderId} 已自动发送给客户 ${customerName}`,
      });
      
      return true;
    } catch (error) {
      console.error('发送通知失败:', error);
      return false;
    }
  };

  // 提交订单
  const handleSubmitOrder = async () => {
    // 验证必填项
    if (!orderForm.senderName || !orderForm.senderPhone || !orderForm.senderAddress ||
        !orderForm.receiverName || !orderForm.receiverPhone || !orderForm.receiverAddress ||
        !orderForm.customerName || !orderForm.customerPhone) {
      Alert.alert('提示', '请填写所有必填信息');
      return;
    }

    setSubmitting(true);
    
    try {
      // 生成缅甸时间格式的订单号
      const orderId = generateMyanmarOrderId();
      const price = calculatePrice();
      
      const packageData = {
        id: orderId,
        sender_name: orderForm.senderName,
        sender_phone: orderForm.senderPhone,
        sender_address: orderForm.senderAddress,
        receiver_name: orderForm.receiverName,
        receiver_phone: orderForm.receiverPhone,
        receiver_address: orderForm.receiverAddress,
        package_type: orderForm.packageType,
        weight: orderForm.weight || '1kg',
        description: orderForm.description || '',
        status: '待取件',
        create_time: new Date().toLocaleString('zh-CN'),
        pickup_time: '',
        delivery_time: '',
        courier: '待分配',
        price: `${price} MMK`
      };

      const result = await packageService.createPackage(packageData);
      
      if (result) {
        // 记录审计日志
        await auditLogService.log({
          user_id: `customer_${orderForm.customerPhone}`,
          user_name: orderForm.customerName,
          action_type: 'create',
          module: 'packages',
          target_id: orderId,
          target_name: `包裹 ${orderId}`,
          action_description: `客户端下单，寄件人：${orderForm.senderName}，收件人：${orderForm.receiverName}，价格：${price} MMK`,
        });

        // 自动发送订单号给客户
        const notificationSent = await sendOrderNotification(
          orderId, 
          orderForm.customerPhone, 
          orderForm.customerName
        );

        // 显示成功信息
        Alert.alert(
          '🎉 下单成功！',
          `📦 订单号：${orderId}\n💰 预计费用：${price} MMK\n📱 订单号和二维码已发送到您的手机\n\n⏰ 我们会在1小时内联系您取件`,
          [
            { 
              text: '📱 生成寄件二维码', 
              onPress: () => {
                setShowQRCodeModal(true);
                setGeneratedOrderId(orderId);
              }
            },
            { 
              text: '📦 继续下单', 
              onPress: () => resetOrderForm() 
            }
          ],
          { cancelable: false }
        );

        // 自动保存客户信息到用户管理
        try {
          const existingUser = await userService.getUserByPhone(orderForm.customerPhone);
          
          if (!existingUser) {
            await userService.createCustomer({
              name: orderForm.customerName,
              phone: orderForm.customerPhone,
              address: orderForm.senderAddress
            });
            console.log('✅ 客户信息已自动保存');
          }
        } catch (userError) {
          console.log('客户信息保存失败:', userError);
        }

      } else {
        Alert.alert('❌ 下单失败', '请检查网络连接后重试');
      }
    } catch (error) {
      console.error('下单失败:', error);
      Alert.alert('❌ 下单失败', '网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 查询包裹
  const handleTrackPackage = async () => {
    if (!trackingId.trim()) {
      Alert.alert('提示', '请输入包裹编号');
      return;
    }

    try {
      const packages = await packageService.getAllPackages();
      const foundPackage = packages.find(pkg => 
        pkg.id.toLowerCase() === trackingId.toLowerCase().trim()
      );

      if (foundPackage) {
        setTrackingResult(foundPackage);
      } else {
        Alert.alert('未找到', '找不到该包裹编号，请检查输入是否正确');
        setTrackingResult(null);
      }
    } catch (error) {
      Alert.alert('查询失败', '网络错误，请重试');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '待取件': return '⏰';
      case '已取件': return '📦';
      case '配送中': return '🚚';
      case '已送达': return '✅';
      case '已取消': return '❌';
      default: return '❓';
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部横幅 */}
      <View style={styles.headerBanner}>
        {/* 顶部控制栏 */}
        <View style={[styles.topControls, { zIndex: 10 }]}>
          {/* 语言选择下拉框（左上角） */}
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowLanguageDropdown(true)}
          >
            <Text style={styles.languageSelectorText}>
              {language === 'zh' ? '中文' : 'ENGLISH'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {/* 管理员入口（右上角） */}
          <TouchableOpacity
            style={styles.adminButtonNew}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.adminTextNew}>
              {language === 'zh' ? '管理员' : 'Admin'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.companyName}>MARKET LINK EXPRESS</Text>
            <Text style={styles.companySlogan}>{t.serviceDescription}</Text>
          </View>
        </View>

        {/* 装饰元素 */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <ScrollView style={styles.content}>
        {/* 服务介绍 */}
        <View style={styles.introSection}>
          <Text style={styles.welcomeTitle}>🚚 {t.professionalExpressService}</Text>
          <Text style={styles.welcomeSubtitle}>
            {t.serviceDescription}
          </Text>
        </View>

        {/* 主要功能卡片 */}
        <View style={styles.servicesSection}>
          <View style={styles.servicesGrid}>
            {/* 立即下单 */}
            <TouchableOpacity 
              style={[styles.serviceCard, { backgroundColor: '#3182ce' }]}
              onPress={() => setShowOrderModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.serviceIcon}>📦</Text>
              <Text style={styles.serviceTitle}>{t.immediateOrder}</Text>
              <Text style={styles.serviceSubtitle}>
                {language === 'zh' ? '快速便捷的下单体验' : 'Fast and convenient ordering'}
              </Text>
              <View style={styles.serviceArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>

            {/* 包裹追踪 */}
            <TouchableOpacity 
              style={[styles.serviceCard, { backgroundColor: '#9b59b6' }]}
              onPress={() => setShowTrackModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.serviceIcon}>🔍</Text>
              <Text style={styles.serviceTitle}>{t.packageTracking}</Text>
              <Text style={styles.serviceSubtitle}>
                {language === 'zh' ? '实时查询包裹状态' : 'Real-time package tracking'}
              </Text>
              <View style={styles.serviceArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 联系我们 */}
          <TouchableOpacity 
            style={[styles.contactCard]}
            onPress={() => Linking.openURL('tel:09-000000000')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>{t.contactCustomerService}</Text>
              <Text style={styles.contactSubtitle}>09-000000000</Text>
            </View>
            <Text style={styles.contactArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 服务特色 */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>
            🌟 {language === 'zh' ? '服务特色' : 'Our Features'}
          </Text>
          
          <View style={styles.featuresList}>
            {[
              { 
                icon: '⚡', 
                title: language === 'zh' ? '快速配送' : 'Fast Delivery',
                desc: language === 'zh' ? '同城1-3小时送达' : 'Same-day delivery in 1-3 hours'
              },
              { 
                icon: '🛡️', 
                title: language === 'zh' ? '安全保障' : 'Safety Guarantee',
                desc: language === 'zh' ? '包裹保险，丢失必赔' : 'Package insurance, full compensation'
              },
              { 
                icon: '📍', 
                title: language === 'zh' ? '实时追踪' : 'Real-time Tracking',
                desc: language === 'zh' ? 'GPS实时定位追踪' : 'GPS real-time location tracking'
              },
              { 
                icon: '💰', 
                title: language === 'zh' ? '价格透明' : 'Transparent Pricing',
                desc: language === 'zh' ? '明码标价，无隐藏费用' : 'Clear pricing, no hidden fees'
              },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 底部信息 */}
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>Market Link Express</Text>
          <Text style={styles.footerSubtitle}>您信赖的快递伙伴</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://market-link-express.com')}>
            <Text style={styles.websiteLink}>🌐 访问官网</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 下单模态框 */}
      <Modal
        visible={showOrderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 {t.expressOrder}</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.orderFormContainer}>
              {/* 寄件人信息 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>📤 {t.senderInfo}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.name} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.senderName}
                    onChangeText={(text) => setOrderForm({...orderForm, senderName: text})}
                    placeholder={t.pleaseEnterSenderName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.phone} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.senderPhone}
                    onChangeText={(text) => setOrderForm({...orderForm, senderPhone: text})}
                    placeholder={t.pleaseEnterSenderPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.address} *</Text>
                  <View style={styles.addressInputContainer}>
                    <TextInput
                      style={[styles.textInput, styles.addressInput]}
                      value={orderForm.senderAddress}
                      onChangeText={(text) => setOrderForm({...orderForm, senderAddress: text})}
                      placeholder={t.pleaseEnterSenderAddress}
                      multiline={true}
                      numberOfLines={2}
                    />
                    <TouchableOpacity 
                      style={styles.mapSelectButton}
                      onPress={() => openMapSelector('sender')}
                    >
                      <Text style={styles.mapSelectButtonText}>🗺️ {t.selectFromMap}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 收件人信息 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>📥 {t.receiverInfo}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.name} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.receiverName}
                    onChangeText={(text) => setOrderForm({...orderForm, receiverName: text})}
                    placeholder={t.pleaseEnterReceiverName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.phone} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.receiverPhone}
                    onChangeText={(text) => setOrderForm({...orderForm, receiverPhone: text})}
                    placeholder={t.pleaseEnterReceiverPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.address} *</Text>
                  <View style={styles.addressInputContainer}>
                    <TextInput
                      style={[styles.textInput, styles.addressInput]}
                      value={orderForm.receiverAddress}
                      onChangeText={(text) => setOrderForm({...orderForm, receiverAddress: text})}
                      placeholder={t.pleaseEnterReceiverAddress}
                      multiline={true}
                      numberOfLines={2}
                    />
                    <TouchableOpacity 
                      style={styles.mapSelectButton}
                      onPress={() => openMapSelector('receiver')}
                    >
                      <Text style={styles.mapSelectButtonText}>🗺️ {t.selectFromMap}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 包裹信息 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>📋 {t.packageInfo}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.packageType} *</Text>
                  <View style={styles.packageTypeGrid}>
                    {[
                      '文件',
                      '标准件（45x60x15cm）以内',
                      '超重件（10 KG）以上',
                      '超规件（45x60x15cm）以上',
                      '易碎品'
                    ].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.packageTypeButton,
                          orderForm.packageType === type && styles.selectedPackageType
                        ]}
                        onPress={() => setOrderForm({...orderForm, packageType: type})}
                      >
                        <Text style={[
                          styles.packageTypeText,
                          orderForm.packageType === type && styles.selectedPackageTypeText
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>重量 (公斤)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.weight}
                    onChangeText={(text) => setOrderForm({...orderForm, weight: text})}
                    placeholder="例如：2.5"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.noteText}>
                    ***如实物和包裹信息内容不一致会导致报价失误***
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>包裹描述</Text>
                  <TextInput
                    style={[styles.textInput, styles.addressInput]}
                    value={orderForm.description}
                    onChangeText={(text) => setOrderForm({...orderForm, description: text})}
                    placeholder="请简要描述包裹内容"
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* 联系信息 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>📞 {t.yourContactInfo}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.yourName} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.customerName}
                    onChangeText={(text) => setOrderForm({...orderForm, customerName: text})}
                    placeholder={t.pleaseEnterYourName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.yourPhone} *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={orderForm.customerPhone}
                    onChangeText={(text) => setOrderForm({...orderForm, customerPhone: text})}
                    placeholder={t.pleaseEnterYourPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* 价格预览 */}
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t.estimatedCost}：</Text>
                  <Text style={styles.priceValue}>{calculatePrice()} MMK</Text>
                </View>
                <Text style={styles.priceNote}>
                  * 最终费用以快递员确认为准
                </Text>
              </View>

              {/* 提交按钮 */}
              <View style={styles.submitSection}>
                <TouchableOpacity 
                  style={styles.cancelOrderButton}
                  onPress={() => {
                    setShowOrderModal(false);
                    resetOrderForm();
                  }}
                >
                  <Text style={styles.cancelOrderText}>{t.cancel}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.submitOrderButton}
                  onPress={handleSubmitOrder}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitOrderText}>📦 {t.submitOrder}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 地图选择模态框 */}
      <Modal
        visible={showMapModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>
                🗺️ {mapType === 'sender' ? t.selectSenderAddress : t.selectReceiverAddress}
              </Text>
              <TouchableOpacity 
                style={styles.mapModalCloseButton}
                onPress={() => setShowMapModal(false)}
              >
                <Text style={styles.mapModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude
                    }}
                    title="选择的位置"
                    description={selectedLocation.address}
                    pinColor="red"
                  />
                )}
              </MapView>

              {/* 当前位置按钮 */}
              <TouchableOpacity 
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.currentLocationButtonText}>📍</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapModalFooter}>
              <TouchableOpacity 
                style={styles.mapCancelButton}
                onPress={() => setShowMapModal(false)}
              >
                <Text style={styles.mapCancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mapConfirmButton}
                onPress={confirmLocationSelection}
              >
                <Text style={styles.mapConfirmButtonText}>{t.confirmSelection}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 包裹追踪模态框 */}
      <Modal
        visible={showTrackModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTrackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.trackModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 包裹追踪</Text>
              <TouchableOpacity onPress={() => setShowTrackModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.trackForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>包裹编号</Text>
                <View style={styles.trackInputContainer}>
                  <TextInput
                    style={styles.trackInput}
                    value={trackingId}
                    onChangeText={setTrackingId}
                    placeholder={t.packageNumberExample}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={styles.trackButton} onPress={handleTrackPackage}>
                    <Text style={styles.trackButtonText}>{t.query}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 查询结果 */}
              {trackingResult && (
                <View style={styles.trackingResult}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultPackageId}>{trackingResult.id}</Text>
                    <View style={[styles.resultStatusBadge, { backgroundColor: getStatusColor(trackingResult.status) }]}>
                      <Text style={styles.resultStatusIcon}>{getStatusIcon(trackingResult.status)}</Text>
                      <Text style={styles.resultStatusText}>{trackingResult.status}</Text>
                    </View>
                  </View>

                  <View style={styles.resultDetails}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>{t.receiver}：</Text>
                      <Text style={styles.resultValue}>{trackingResult.receiver_name}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>{t.receiverAddress}：</Text>
                      <Text style={styles.resultValue}>{trackingResult.receiver_address}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>{t.courier}：</Text>
                      <Text style={styles.resultValue}>{trackingResult.courier}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>{t.createTime}：</Text>
                      <Text style={styles.resultValue}>{trackingResult.create_time}</Text>
                    </View>
                    {trackingResult.pickup_time && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>{t.pickupTime}：</Text>
                        <Text style={styles.resultValue}>{trackingResult.pickup_time}</Text>
                      </View>
                    )}
                    {trackingResult.delivery_time && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>{t.deliveryTime}：</Text>
                        <Text style={styles.resultValue}>{trackingResult.delivery_time}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 语言选择下拉菜单 */}
      <Modal
        visible={showLanguageDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.languageDropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageDropdown(false)}
        >
          <View style={styles.languageDropdownContainer}>
            <View style={styles.languageDropdownContent}>
              <Text style={styles.languageDropdownTitle}>选择语言 / Select Language</Text>
              
              {/* 中文选项 */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'zh' && styles.selectedLanguageOption
                ]}
                onPress={async () => {
                  await updateSettings({ language: 'zh' });
                  setShowLanguageDropdown(false);
                }}
              >
                <Text style={styles.languageOptionText}>中文</Text>
                {language === 'zh' && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>

              {/* English选项 */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'en' && styles.selectedLanguageOption
                ]}
                onPress={async () => {
                  await updateSettings({ language: 'en' });
                  setShowLanguageDropdown(false);
                }}
              >
                <Text style={styles.languageOptionText}>ENGLISH</Text>
                {language === 'en' && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 条形码模态框 */}
      <Modal
        visible={showQRCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrCodeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'zh' ? '寄件二维码' : 'Order QR Code'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowQRCodeModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrCodeContent}>
              <Text style={styles.qrCodeTitle}>
                {language === 'zh' ? '订单二维码' : 'Order QR Code'}
              </Text>
              <Text style={styles.qrCodeSubtitle}>
                {language === 'zh' ? '订单号' : 'Order ID'}: {generatedOrderId}
              </Text>
              
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={generatedOrderId}
                  size={200}
                  color="#2c5282"
                  backgroundColor="#fff"
                />
              </View>
              
              <Text style={styles.qrCodeInstructions}>
                {language === 'zh' ? 
                  '请保存此二维码\n快递员将扫描此码进行取件\n建议截图保存到相册' : 
                  'Please save this QR code\nCourier will scan this code for pickup\nRecommend screenshot to save to album'
                }
              </Text>

              <View style={styles.qrCodeActions}>
                <TouchableOpacity 
                  style={styles.qrCodeButton}
                  onPress={() => setShowQRCodeModal(false)}
                >
                  <Text style={styles.qrCodeButtonText}>
                    {language === 'zh' ? '关闭' : 'Close'}
                  </Text>
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
    backgroundColor: '#f0f4f8',
  },
  headerBanner: {
    backgroundColor: '#1a365d',
    paddingTop: 50,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  languageSelector: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageSelectorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownArrow: {
    color: '#fff',
    fontSize: 10,
  },
  // 语言下拉菜单样式
  languageDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  languageDropdownContainer: {
    position: 'absolute',
    top: 95,
    left: 20,
    zIndex: 1000,
  },
  languageDropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  languageDropdownTitle: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedLanguageOption: {
    backgroundColor: '#f0f4f8',
  },
  languageOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
  },
  checkMark: {
    fontSize: 16,
    color: '#2c5282',
    fontWeight: 'bold',
  },
  adminButtonNew: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 80,
    minHeight: 44,
  },
  adminTextNew: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  companySlogan: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  adminButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  adminIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  adminText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(49,130,206,0.1)',
    top: -50,
    right: -50,
    zIndex: 1,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(192,192,192,0.05)',
    bottom: -20,
    left: -20,
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  introSection: {
    padding: 20,
    paddingBottom: 0,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  servicesSection: {
    padding: 20,
  },
  servicesGrid: {
    gap: 16,
    marginBottom: 16,
  },
  serviceCard: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  serviceIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  serviceSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  serviceArrow: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  arrowText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.7)',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  contactIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 16,
    color: '#3182ce',
    fontWeight: '600',
  },
  contactArrow: {
    fontSize: 24,
    color: '#cbd5e0',
  },
  featuresSection: {
    padding: 20,
    paddingTop: 0,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  footerSection: {
    padding: 40,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  websiteLink: {
    fontSize: 16,
    color: '#3182ce',
    fontWeight: '600',
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  orderModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  trackModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
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
    fontSize: 20,
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
  orderFormContainer: {
    maxHeight: 500,
    paddingVertical: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
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
  noteText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 6,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  packageTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  packageTypeButton: {
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: '30%',
    alignItems: 'center',
  },
  selectedPackageType: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  packageTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPackageTypeText: {
    color: '#fff',
    fontWeight: '600',
  },
  priceSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  priceNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  submitSection: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelOrderButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelOrderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitOrderButton: {
    flex: 2,
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitOrderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // 追踪模态框样式
  trackForm: {
    paddingVertical: 16,
  },
  trackInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trackInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  trackButton: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  trackButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  trackingResult: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultPackageId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  resultStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  resultStatusIcon: {
    fontSize: 16,
  },
  resultStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  resultDetails: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  resultValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  
  // 地图选择相关样式
  addressInputContainer: {
    position: 'relative',
  },
  mapSelectButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2c5282',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mapSelectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // 地图模态框样式
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c5282',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  mapModalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  currentLocationButtonText: {
    fontSize: 24,
  },
  mapModalFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  mapCancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  mapConfirmButton: {
    flex: 1,
    backgroundColor: '#2c5282',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // 条形码模态框样式
  qrCodeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  qrCodeContent: {
    padding: 20,
    alignItems: 'center',
  },
  qrCodeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  barcodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  barcodeWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2c5282',
    borderStyle: 'dashed',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    height: 60,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  barcodeLine: {
    backgroundColor: '#2c5282',
    marginHorizontal: 1,
    borderRadius: 1,
    minWidth: 2,
  },
  barcodeText: {
    fontSize: 12,
    color: '#2c5282',
    fontWeight: '500',
  },
  qrCodeInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  qrCodeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  qrCodeButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  qrCodeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
