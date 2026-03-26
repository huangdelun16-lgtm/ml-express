import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title,
  description,
  actionText,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      
      {actionText && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <LinearGradient
            colors={['#2E86AB', '#4CA1CF']}
            style={styles.actionButtonGradient}
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// 订单为空状态
export const EmptyOrders: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
  <EmptyState
    icon="📋"
    title="暂无订单"
    description="您还没有任何订单，点击下方按钮开始下单吧！"
    actionText="立即下单"
    onAction={onAction}
  />
);

// 搜索结果为空状态
export const EmptySearchResults: React.FC<{ onAction?: () => void }> = ({ onAction }) => (
  <EmptyState
    icon="🔍"
    title="未找到相关订单"
    description="请检查订单号是否正确，或尝试其他搜索条件"
    actionText="重新搜索"
    onAction={onAction}
  />
);

// 网络错误状态
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="📶"
    title="网络连接失败"
    description="请检查网络连接后重试"
    actionText="重新加载"
    onAction={onRetry}
  />
);

// 加载失败状态
export const LoadError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="⚠️"
    title="加载失败"
    description="数据加载失败，请重试"
    actionText="重新加载"
    onAction={onRetry}
  />
);

// 暂无数据状态
export const NoData: React.FC<{ message?: string }> = ({ message = "暂无数据" }) => (
  <EmptyState
    icon="📭"
    title={message}
  />
);

// 权限被拒绝状态
export const PermissionDenied: React.FC<{ 
  permission: string; 
  onRequest?: () => void 
}> = ({ permission, onRequest }) => (
  <EmptyState
    icon="🔒"
    title={`${permission}权限被拒绝`}
    description="请在设置中开启相关权限以使用完整功能"
    actionText="去设置"
    onAction={onRequest}
  />
);

// 离线状态
export const OfflineState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="📵"
    title="网络离线"
    description="当前网络不可用，请检查网络连接"
    actionText="重试"
    onAction={onRetry}
  />
);

// 维护状态
export const MaintenanceMode: React.FC = () => (
  <EmptyState
    icon="🔧"
    title="系统维护中"
    description="我们正在对系统进行维护，请稍后再试"
  />
);

// 版本过旧状态
export const OutdatedVersion: React.FC<{ onUpdate?: () => void }> = ({ onUpdate }) => (
  <EmptyState
    icon="📱"
    title="版本过旧"
    description="当前版本已过时，请更新到最新版本以获得更好体验"
    actionText="立即更新"
    onAction={onUpdate}
  />
);

// 自定义空状态
export const CustomEmptyState: React.FC<EmptyStateProps> = (props) => (
  <EmptyState {...props} />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default EmptyState;
