// 主题系统
export interface ThemeColors {
  // 背景色
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  
  // 文字色
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // 状态色
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // 边框和分隔线
  border: string;
  divider: string;
  
  // 特殊色
  overlay: string;
  shadow: string;
}

export const lightTheme: ThemeColors = {
  // 背景色
  primary: '#2c5282',
  secondary: '#3182ce',
  background: '#f0f4f8',
  surface: '#ffffff',
  card: '#ffffff',
  
  // 文字色
  text: '#2c3e50',
  textSecondary: '#666666',
  textMuted: '#999999',
  
  // 状态色
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
  
  // 边框和分隔线
  border: '#e5e7eb',
  divider: '#f0f0f0',
  
  // 特殊色
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const darkTheme: ThemeColors = {
  // 背景色
  primary: '#4a90e2',
  secondary: '#5dade2',
  background: '#121212',
  surface: '#1e1e1e',
  card: '#2d2d2d',
  
  // 文字色
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  
  // 状态色
  success: '#2ecc71',
  warning: '#f1c40f',
  error: '#e74c3c',
  info: '#3498db',
  
  // 边框和分隔线
  border: '#404040',
  divider: '#333333',
  
  // 特殊色
  overlay: 'rgba(0, 0, 0, 0.8)',
  shadow: '#000000',
};

export const getTheme = (themeMode: string): ThemeColors => {
  switch (themeMode) {
    case 'dark':
      return darkTheme;
    case 'auto':
      // 简化：默认返回浅色主题
      // 实际应用中可以检测系统主题
      return lightTheme;
    default:
      return lightTheme;
  }
};
