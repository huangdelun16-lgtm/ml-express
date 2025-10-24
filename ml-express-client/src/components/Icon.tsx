import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// 图标映射表
const iconMap: { [key: string]: string } = {
  // 基础图标
  'home': '🏠',
  'user': '👤',
  'settings': '⚙️',
  'search': '🔍',
  'plus': '➕',
  'minus': '➖',
  'check': '✓',
  'close': '✕',
  'edit': '✏️',
  'delete': '🗑️',
  'info': 'ℹ️',
  'warning': '⚠️',
  'error': '❌',
  'success': '✅',
  
  // 导航图标
  'back': '←',
  'forward': '→',
  'up': '↑',
  'down': '↓',
  'menu': '☰',
  
  // 通信图标
  'phone': '📞',
  'email': '📧',
  'message': '💬',
  'notification': '🔔',
  
  // 文件图标
  'file': '📄',
  'folder': '📁',
  'download': '⬇️',
  'upload': '⬆️',
  'share': '📤',
  
  // 时间图标
  'clock': '🕐',
  'calendar': '📅',
  'time': '⏰',
  
  // 位置图标
  'location': '📍',
  'map': '🗺️',
  'navigation': '🧭',
  
  // 运输图标
  'truck': '🚚',
  'car': '🚗',
  'bike': '🚲',
  'motorcycle': '🏍️',
  'plane': '✈️',
  'ship': '🚢',
  
  // 包裹图标
  'package': '📦',
  'box': '📦',
  'delivery': '🚚',
  'pickup': '📥',
  'dropoff': '📤',
  
  // 支付图标
  'money': '💰',
  'card': '💳',
  'cash': '💵',
  'coin': '🪙',
  
  // 状态图标
  'pending': '⏳',
  'processing': '🔄',
  'completed': '✅',
  'cancelled': '❌',
  'in-transit': '🚚',
  'delivered': '📦',
  
  // 天气图标
  'sunny': '☀️',
  'cloudy': '☁️',
  'rainy': '🌧️',
  'stormy': '⛈️',
  
  // 表情图标
  'happy': '😊',
  'sad': '😢',
  'angry': '😠',
  'surprised': '😲',
  'thinking': '🤔',
  
  // 特殊图标
  'star': '⭐',
  'heart': '❤️',
  'like': '👍',
  'dislike': '👎',
  'fire': '🔥',
  'lightning': '⚡',
  'lock': '🔒',
  'unlock': '🔓',
  'key': '🔑',
  'shield': '🛡️',
  
  // 应用特定图标
  'order': '📋',
  'track': '🔍',
  'profile': '👤',
  'history': '📜',
  'statistics': '📊',
  'chart': '📈',
  'graph': '📊',
  'analytics': '📈',
  
  // 包裹类型图标
  'document': '📄',
  'standard': '📦',
  'overweight': '⚖️',
  'oversized': '📏',
  'fragile': '⚠️',
  'food': '🍔',
  'drink': '🥤',
  
  // 配送速度图标
  'standard-delivery': '🚚',
  'express-delivery': '⚡',
  'scheduled-delivery': '⏰',
  
  // 地图相关图标
  'marker': '📍',
  'route': '🛣️',
  'destination': '🎯',
  'waypoint': '📍',
  
  // 二维码相关图标
  'qr-code': '📱',
  'scan': '📷',
  'barcode': '📊',
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  color = '#000', 
  style 
}) => {
  const iconChar = iconMap[name] || '?';
  
  return (
    <Text 
      style={[
        styles.icon, 
        { 
          fontSize: size, 
          color,
        }, 
        style
      ]}
    >
      {iconChar}
    </Text>
  );
};

// 预定义的图标组件
export const HomeIcon = (props: Omit<IconProps, 'name'>) => <Icon name="home" {...props} />;
export const UserIcon = (props: Omit<IconProps, 'name'>) => <Icon name="user" {...props} />;
export const SettingsIcon = (props: Omit<IconProps, 'name'>) => <Icon name="settings" {...props} />;
export const SearchIcon = (props: Omit<IconProps, 'name'>) => <Icon name="search" {...props} />;
export const PlusIcon = (props: Omit<IconProps, 'name'>) => <Icon name="plus" {...props} />;
export const MinusIcon = (props: Omit<IconProps, 'name'>) => <Icon name="minus" {...props} />;
export const CheckIcon = (props: Omit<IconProps, 'name'>) => <Icon name="check" {...props} />;
export const CloseIcon = (props: Omit<IconProps, 'name'>) => <Icon name="close" {...props} />;
export const EditIcon = (props: Omit<IconProps, 'name'>) => <Icon name="edit" {...props} />;
export const DeleteIcon = (props: Omit<IconProps, 'name'>) => <Icon name="delete" {...props} />;
export const InfoIcon = (props: Omit<IconProps, 'name'>) => <Icon name="info" {...props} />;
export const WarningIcon = (props: Omit<IconProps, 'name'>) => <Icon name="warning" {...props} />;
export const ErrorIcon = (props: Omit<IconProps, 'name'>) => <Icon name="error" {...props} />;
export const SuccessIcon = (props: Omit<IconProps, 'name'>) => <Icon name="success" {...props} />;

// 包裹相关图标
export const PackageIcon = (props: Omit<IconProps, 'name'>) => <Icon name="package" {...props} />;
export const DeliveryIcon = (props: Omit<IconProps, 'name'>) => <Icon name="delivery" {...props} />;
export const PickupIcon = (props: Omit<IconProps, 'name'>) => <Icon name="pickup" {...props} />;
export const DropoffIcon = (props: Omit<IconProps, 'name'>) => <Icon name="dropoff" {...props} />;

// 状态图标
export const PendingIcon = (props: Omit<IconProps, 'name'>) => <Icon name="pending" {...props} />;
export const ProcessingIcon = (props: Omit<IconProps, 'name'>) => <Icon name="processing" {...props} />;
export const CompletedIcon = (props: Omit<IconProps, 'name'>) => <Icon name="completed" {...props} />;
export const CancelledIcon = (props: Omit<IconProps, 'name'>) => <Icon name="cancelled" {...props} />;
export const InTransitIcon = (props: Omit<IconProps, 'name'>) => <Icon name="in-transit" {...props} />;
export const DeliveredIcon = (props: Omit<IconProps, 'name'>) => <Icon name="delivered" {...props} />;

// 位置相关图标
export const LocationIcon = (props: Omit<IconProps, 'name'>) => <Icon name="location" {...props} />;
export const MapIcon = (props: Omit<IconProps, 'name'>) => <Icon name="map" {...props} />;
export const NavigationIcon = (props: Omit<IconProps, 'name'>) => <Icon name="navigation" {...props} />;

// 支付相关图标
export const MoneyIcon = (props: Omit<IconProps, 'name'>) => <Icon name="money" {...props} />;
export const CardIcon = (props: Omit<IconProps, 'name'>) => <Icon name="card" {...props} />;

// 时间相关图标
export const ClockIcon = (props: Omit<IconProps, 'name'>) => <Icon name="clock" {...props} />;
export const CalendarIcon = (props: Omit<IconProps, 'name'>) => <Icon name="calendar" {...props} />;

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

export default Icon;
