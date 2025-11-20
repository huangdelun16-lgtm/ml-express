import { useMemo } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { useApp } from '../contexts/AppContext';

/**
 * 根据语言调整字体大小的Hook
 * 缅语字体自动缩小2px
 */
export const useLanguageStyles = <T extends Record<string, any>>(
  baseStyles: T
): T => {
  const { language } = useApp();
  
  return useMemo(() => {
    if (language !== 'my') {
      return baseStyles;
    }
    
    const adjustedStyles: any = {};
    
    for (const key in baseStyles) {
      const style = baseStyles[key];
      
      // 如果是数组样式，递归处理
      if (Array.isArray(style)) {
        adjustedStyles[key] = style.map(s => {
          if (s && typeof s === 'object' && s.fontSize) {
            return { ...s, fontSize: Math.max(s.fontSize - 2, 10) };
          }
          return s;
        });
      } 
      // 如果是对象样式且有fontSize
      else if (style && typeof style === 'object' && style.fontSize) {
        adjustedStyles[key] = {
          ...style,
          fontSize: Math.max(style.fontSize - 2, 10)
        };
      } 
      // 其他情况保持原样
      else {
        adjustedStyles[key] = style;
      }
    }
    
    return adjustedStyles as T;
  }, [baseStyles, language]);
};

/**
 * 根据语言调整单个字体大小
 */
export const useFontSize = (baseSize: number): number => {
  const { language } = useApp();
  
  return useMemo(() => {
    if (language === 'my') {
      return Math.max(baseSize - 2, 10);
    }
    return baseSize;
  }, [baseSize, language]);
};

