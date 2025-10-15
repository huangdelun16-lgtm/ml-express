import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Switch,
  StyleSheet,
} from 'react-native';

// 无障碍属性接口
interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
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
  style?: any;
  label?: string;
}

export const AccessibleTextInput: React.FC<AccessibleTextInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  style,
  label,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && (
        <Text
          style={styles.inputLabel}
          accessibilityRole="text"
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
        accessibilityRole="text"
        {...accessibilityProps}
      />
    </View>
  );
};

// 无障碍卡片组件
interface AccessibleCardProps extends AccessibilityProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  title?: string;
  subtitle?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  onPress,
  style,
  title,
  subtitle,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[styles.card, style]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint || subtitle}
      accessibilityRole={onPress ? 'button' : 'summary'}
      {...accessibilityProps}
    >
      {title && (
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={styles.cardSubtitle} accessibilityRole="text">
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
  style?: any;
  resizeMode?: any;
  alt?: string; // 替代文本
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  alt,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      accessible={true}
      accessibilityLabel={accessibilityLabel || alt}
      accessibilityHint={accessibilityHint}
      accessibilityRole="image"
      {...accessibilityProps}
    />
  );
};

// 无障碍开关组件
interface AccessibleSwitchProps extends AccessibilityProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const AccessibleSwitch: React.FC<AccessibleSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  label,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <View style={styles.switchContainer}>
      {label && (
        <Text
          style={styles.switchLabel}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessible={true}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
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
  style?: any;
  title?: string;
}

export const AccessibleList: React.FC<AccessibleListProps> = ({
  data,
  renderItem,
  keyExtractor,
  style,
  title,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  return (
    <ScrollView
      style={[styles.list, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="list"
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
          accessibilityRole="listitem"
          accessibilityLabel={`${title} 项目 ${index + 1}`}
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
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="header"
      accessibilityLevel={level}
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
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const handlePress = () => {
    // 这里应该使用 Linking.openURL(url)
    console.log('打开链接:', url);
  };

  return (
    <TouchableOpacity
      style={[styles.link, style]}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  card: {
    backgroundColor: 'white',
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  heading: {
    fontWeight: 'bold',
    color: '#1f2937',
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
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
