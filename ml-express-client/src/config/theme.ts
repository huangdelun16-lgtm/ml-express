export const colors = {
  // 品牌色
  brand: '#2E86AB',
  
  // 主色调 (Blue)
  primary: {
    light: '#93c5fd', // blue-300
    DEFAULT: '#3b82f6', // blue-500
    dark: '#2563eb', // blue-600
    darker: '#1d4ed8', // blue-700
  },
  
  // 辅助色 (Amber/Orange)
  secondary: {
    light: '#fcd34d', // amber-300
    DEFAULT: '#f59e0b', // amber-500
    dark: '#d97706', // amber-600
  },
  
  // 状态色
  success: {
    light: '#6ee7b7', // emerald-300
    DEFAULT: '#10b981', // emerald-500
    dark: '#059669', // emerald-600
    bg: '#f0fdf4', // emerald-50
  },
  error: {
    light: '#fca5a5', // red-300
    DEFAULT: '#ef4444', // red-500
    dark: '#dc2626', // red-600
    bg: '#fef2f2', // red-50
  },
  warning: {
    light: '#fdba74', // amber-300
    DEFAULT: '#f59e0b', // amber-500
    dark: '#d97706', // amber-600
    bg: '#fffbeb', // amber-50
  },
  info: {
    light: '#93c5fd', // blue-300
    DEFAULT: '#3b82f6', // blue-500
    dark: '#2563eb', // blue-600
    bg: '#eff6ff', // blue-50
  },
  
  // 文本色
  text: {
    primary: '#1e293b', // slate-800
    secondary: '#64748b', // slate-500
    tertiary: '#94a3b8', // slate-400
    light: '#ffffff',
    inverse: '#ffffff',
    disabled: '#cbd5e1', // slate-300
  },
  
  // 背景色
  background: {
    default: '#f8fafc', // slate-50
    paper: '#ffffff',
    subtle: '#f1f5f9', // slate-100
    input: '#f8fafc',
  },
  
  // 边框色
  border: {
    light: '#f1f5f9', // slate-100
    DEFAULT: '#e2e8f0', // slate-200
    dark: '#cbd5e1', // slate-300
  },
  
  // 特殊颜色
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
  
  // 渐变色预设
  gradients: {
    primary: ['#b0d3e8', '#7895a3'],
    blue: ['#3b82f6', '#2563eb'],
    green: ['#10b981', '#059669'],
    orange: ['#f59e0b', '#d97706'],
    red: ['#ef4444', '#dc2626'],
    contact: ['#fa709a', '#fee140'],
  }
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  sizes: {
    xs: 12,
    s: 13,
    m: 14,
    l: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
  },
  weights: {
    regular: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
  },
};

export const borderRadius = {
  s: 4,
  m: 8,
  l: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};

