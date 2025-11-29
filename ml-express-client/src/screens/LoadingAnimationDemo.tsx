import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PackageLoadingAnimation from '../components/PackageLoadingAnimation';
import DeliveryLoadingAnimation from '../components/DeliveryLoadingAnimation';
import { useLoading } from '../contexts/LoadingContext';

export default function LoadingAnimationDemo() {
  const { showLoading, hideLoading } = useLoading();

  const testPackageLoading = () => {
    showLoading('正在处理订单...', 'package');
    setTimeout(() => hideLoading(), 3000);
  };

  const testDeliveryLoading = () => {
    showLoading('正在配送中...', 'delivery');
    setTimeout(() => hideLoading(), 3000);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#b0d3e8', '#7895a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>加载动画演示</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Text style={styles.headerSubtitle}>MARKET LINK EXPRESS</Text>
          <Text style={[styles.headerSubtitle, { fontStyle: 'italic', marginLeft: 8, fontSize: 10 }]}>Delivery Service</Text>
        </View>
      </LinearGradient>

      {/* 3D快递盒动画 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎁 3D快递盒动画</Text>
        <Text style={styles.sectionDesc}>
          高级3D立体效果，适用于订单处理、数据加载
        </Text>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>小尺寸 (Small)</Text>
          <PackageLoadingAnimation size="small" />
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>中等尺寸 (Medium)</Text>
          <PackageLoadingAnimation size="medium" />
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>大尺寸 (Large)</Text>
          <PackageLoadingAnimation size="large" />
        </View>

        <TouchableOpacity
          style={styles.testButton}
          onPress={testPackageLoading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#2E86AB', '#1c6a8f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>测试全屏快递盒动画（3秒）</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 送货卡车动画 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚚 送货卡车动画</Text>
        <Text style={styles.sectionDesc}>
          动态配送场景，适用于配送追踪、订单配送
        </Text>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>小尺寸 (Small)</Text>
          <DeliveryLoadingAnimation size="small" />
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>中等尺寸 (Medium)</Text>
          <DeliveryLoadingAnimation size="medium" />
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoLabel}>大尺寸 (Large)</Text>
          <DeliveryLoadingAnimation size="large" />
        </View>

        <TouchableOpacity
          style={styles.testButton}
          onPress={testDeliveryLoading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#F18F01', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>测试全屏卡车动画（3秒）</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 特性说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ 动画特性</Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🎨 3D快递盒动画</Text>
          <Text style={styles.featureItem}>• 真实的3D立体效果</Text>
          <Text style={styles.featureItem}>• 盒盖自然开合动画</Text>
          <Text style={styles.featureItem}>• 光芒脉动效果</Text>
          <Text style={styles.featureItem}>• 5个粒子漂浮动画</Text>
          <Text style={styles.featureItem}>• 动态阴影效果</Text>
          <Text style={styles.featureItem}>• 品牌LOGO展示</Text>
          <Text style={styles.featureItem}>• 暂停/重置控制</Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🚚 送货卡车动画</Text>
          <Text style={styles.featureItem}>• 品牌送货卡车</Text>
          <Text style={styles.featureItem}>• 轮子旋转动画</Text>
          <Text style={styles.featureItem}>• 双排气烟雾效果</Text>
          <Text style={styles.featureItem}>• 包裹跳动动画</Text>
          <Text style={styles.featureItem}>• 司机和货箱细节</Text>
          <Text style={styles.featureItem}>• 品牌标识展示</Text>
        </View>
      </View>

      {/* 使用场景 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 使用场景</Text>

        <View style={styles.useCaseCard}>
          <Text style={styles.useCaseTitle}>📦 快递盒动画适用于：</Text>
          <Text style={styles.useCaseItem}>✓ 创建订单</Text>
          <Text style={styles.useCaseItem}>✓ 加载订单列表</Text>
          <Text style={styles.useCaseItem}>✓ 提交表单</Text>
          <Text style={styles.useCaseItem}>✓ 数据刷新</Text>
          <Text style={styles.useCaseItem}>✓ 页面加载</Text>
        </View>

        <View style={styles.useCaseCard}>
          <Text style={styles.useCaseTitle}>🚚 卡车动画适用于：</Text>
          <Text style={styles.useCaseItem}>✓ 配送追踪</Text>
          <Text style={styles.useCaseItem}>✓ 订单配送中</Text>
          <Text style={styles.useCaseItem}>✓ 地图导航</Text>
          <Text style={styles.useCaseItem}>✓ 路线规划</Text>
          <Text style={styles.useCaseItem}>✓ 实时跟踪</Text>
        </View>
      </View>

      {/* 代码示例 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 代码示例</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>使用快递盒动画：</Text>
          <Text style={styles.code}>
            {`const { showLoading, hideLoading } = useLoading();\n\nshowLoading('处理订单...', 'package');\nawait processOrder();\nhideLoading();`}
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>使用卡车动画：</Text>
          <Text style={styles.code}>
            {`const { showLoading, hideLoading } = useLoading();\n\nshowLoading('配送中...', 'delivery');\nawait trackDelivery();\nhideLoading();`}
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  demoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  demoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 20,
  },
  useCaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  useCaseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  useCaseItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  code: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});

