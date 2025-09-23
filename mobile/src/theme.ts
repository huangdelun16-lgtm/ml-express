import { MD3LightTheme, MD3Theme } from 'react-native-paper';
import { DesignTokens } from './designSystem';

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: DesignTokens.borderRadius.lg,
  colors: {
    ...MD3LightTheme.colors,
    primary: DesignTokens.colors.primary[500],
    primaryContainer: DesignTokens.colors.primary[100],
    secondary: DesignTokens.colors.secondary[500],
    secondaryContainer: DesignTokens.colors.secondary[100],
    background: DesignTokens.colors.background.secondary,
    surface: DesignTokens.colors.background.primary,
    surfaceVariant: DesignTokens.colors.background.tertiary,
    outline: `rgba(25, 118, 210, 0.16)`,
    outlineVariant: `rgba(25, 118, 210, 0.08)`,
    onPrimary: DesignTokens.colors.text.inverse,
    onSecondary: DesignTokens.colors.text.inverse,
    onBackground: DesignTokens.colors.text.primary,
    onSurface: DesignTokens.colors.text.primary,
    onSurfaceVariant: DesignTokens.colors.text.secondary,
    error: DesignTokens.colors.error,
    success: DesignTokens.colors.success,
    warning: DesignTokens.colors.warning,
    info: DesignTokens.colors.info,
  },
};

// 导出设计令牌供组件使用
export { DesignTokens, ComponentStyles } from './designSystem';

// 主题工具函数
export const getThemeColor = (colorPath: string) => {
  const paths = colorPath.split('.');
  let result: any = DesignTokens.colors;
  for (const path of paths) {
    result = result[path];
  }
  return result;
};

export const getSpacing = (multiplier: number) => {
  return DesignTokens.spacing[multiplier as keyof typeof DesignTokens.spacing] || multiplier * 4;
};

export const getShadow = (level: keyof typeof DesignTokens.shadows) => {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: level === 'sm' ? 1 : level === 'base' ? 2 : level === 'md' ? 4 : 8 },
    shadowOpacity: level === 'sm' ? 0.05 : level === 'base' ? 0.1 : level === 'md' ? 0.15 : 0.25,
    shadowRadius: level === 'sm' ? 2 : level === 'base' ? 4 : level === 'md' ? 8 : 16,
    elevation: level === 'sm' ? 1 : level === 'base' ? 3 : level === 'md' ? 6 : 12,
  };
};}]}}}


