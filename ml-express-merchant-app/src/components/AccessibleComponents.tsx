import React from 'react';
import LoggerService from '../services/LoggerService';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Switch,
  StyleSheet,
  AccessibilityRole,
} from 'react-native';

// 无障碍属性接口
interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: any;
  accessibilityValue?: any;
  accessibilityActions?: Array<{
    name: string;
    label: string;
  }>;
  onAccessibilityAction?: (event: any) => void;
}

// 无障碍按钮组件
interface AccessibleButtonProps extends AccessibilityProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...accessibilityProps}
    >
      <Text style={[styles.buttonText, textStyle, disabled && styles.buttonTextDisabled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// 无障碍文本输入组件
interface AccessibleTextInputProps extends AccessibilityProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  label?: string;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  label,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && (
        <Text
          style={styles.inputLabel}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[styles.textInput, style]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        accessible={true}
        accessibilityLabel={accessibilityLabel || label || placeholder}
        accessibilityHint={accessibilityHint}
        {...accessibilityProps}
      />
    </View>
  );
};

// 无障碍卡片组件
interface AccessibleCardProps extends AccessibilityProps {
  children: React.ReactNode;
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  style?: any;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  onPress,
  title,
  subtitle,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[styles.card, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint || subtitle}
      accessibilityRole={onPress ? 'button' : undefined}
      {...accessibilityProps}
    >
      {title && (
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={styles.cardSubtitle}>
          {subtitle}
        </Text>
      )}
      {children}
    </CardComponent>
  );
};

// 无障碍图片组件
interface AccessibleImageProps extends AccessibilityProps {
  source: { uri: string } | number;
  resizeMode?: any;
  alt?: string; // 替代文本
  style?: any;
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  source,
  resizeMode = 'cover',
  alt,
  style,
  accessibilityLabel,
  ...accessibilityProps
}) => {
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel || alt}
      accessibilityRole="image"
      {...accessibilityProps}
    />
  );
};

// 无障碍开关组件
interface AccessibleSwitchProps extends AccessibilityProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: any;
}

export const AccessibleSwitch: React.FC<AccessibleSwitchProps> = ({
  value,
  onValueChange,
  label,
  disabled = false,
  style,
  accessibilityLabel,
  ...accessibilityProps
}) => {
  return (
    <View style={styles.switchContainer}>
      {label && <Text style={styles.switchLabel}>{label}</Text>}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        {...accessibilityProps}
      />
    </View>
  );
};

// 无障碍列表组件
interface AccessibleListProps extends AccessibilityProps {
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactElement;
  keyExtractor: (item: any, index: number) => string;
  title?: string;
  style?: any;
}

export const AccessibleList: React.FC<AccessibleListProps> = ({
  data,
  renderItem,
  keyExtractor,
  title,
  style,
  accessibilityLabel,
  ...accessibilityProps
}) => {
  return (
    <ScrollView
      style={[styles.list, style]}
      accessibilityLabel={accessibilityLabel}
      {...accessibilityProps}
    >
      {title && (
        <Text style={styles.listTitle} accessibilityRole="header">
          {title}
        </Text>
      )}
      {data.map((item, index) => (
        <View
          key={keyExtractor(item, index)}
          accessible={true}
          accessibilityLabel={`${title || '列表'} 项目 ${index + 1}`}
        >
          {renderItem({ item, index })}
        </View>
      ))}
    </ScrollView>
  );
};

// 无障碍标题组件
interface AccessibleHeadingProps extends AccessibilityProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  style?: any;
}

export const AccessibleHeading: React.FC<AccessibleHeadingProps> = ({
  level,
  children,
  style,
  accessibilityLabel,
  ...accessibilityProps
}) => {
  const headingStyle = [
    styles.heading,
    styles[`heading${level}` as keyof typeof styles],
    style,
  ];
  return (
    <Text
      style={headingStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="header"
      {...accessibilityProps}
    >
      {children}
    </Text>
  );
};

// 无障碍链接组件
interface AccessibleLinkProps extends AccessibilityProps {
  url: string;
  children: React.ReactNode;
  style?: any;
  textStyle?: any;
}

export const AccessibleLink: React.FC<AccessibleLinkProps> = ({
  url,
  children,
  style,
  textStyle,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const handlePress = () => {
    // 这里应该使用 Linking.openURL(url)
    LoggerService.debug('打开链接', { url });
  };
  
  return (
    <TouchableOpacity
      style={[styles.link, style]}
      onPress={handlePress}
      accessibilityHint={accessibilityHint || `打开链接: ${url}`}
      accessibilityRole="link"
      {...accessibilityProps}
    >
      <Text style={[styles.linkText, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// 无障碍工具函数
export const AccessibilityUtils = {
  // 生成无障碍标签
  generateLabel: (prefix: string, ...parts: string[]): string => {
    return [prefix, ...parts].filter(Boolean).join(', ');
  },
  // 生成无障碍提示
  generateHint: (action: string, context?: string): string => {
    return context ? `${action} ${context}` : action;
  },
  // 检查无障碍设置
  isAccessibilityEnabled: (): boolean => {
    // 在实际应用中，这里应该检查系统的无障碍设置
    return true;
  },
  // 获取屏幕阅读器状态
  isScreenReaderEnabled: (): boolean => {
    // 在实际应用中，这里应该检查屏幕阅读器状态
    return false;
  },
  // 生成数字的无障碍描述
  formatNumber: (num: number): string => {
    return num.toString();
  },
  // 生成日期的无障碍描述
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
  // 生成时间的无障碍描述
  formatTime: (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};

// 无障碍样式
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2E86AB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#d1d5db',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
  },
  list: {
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  heading: {
  },
  heading1: {
    fontSize: 32,
  },
  heading2: {
    fontSize: 28,
  },
  heading3: {
    fontSize: 24,
  },
  heading4: {
    fontSize: 20,
  },
  heading5: {
    fontSize: 18,
  },
  heading6: {
    fontSize: 16,
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    color: '#2E86AB',
    textDecorationLine: 'underline',
  },
});
