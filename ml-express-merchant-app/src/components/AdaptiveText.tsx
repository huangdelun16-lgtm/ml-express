import React from 'react';
import { Text, TextProps } from 'react-native';
import { useApp } from '../contexts/AppContext';

interface AdaptiveTextProps extends TextProps {
  children: React.ReactNode;
}

/**
 * 自适应文本组件 - 根据语言自动调整字体大小
 * 缅语字体自动缩小2px
 */
export const AdaptiveText: React.FC<AdaptiveTextProps> = ({ style, children, ...props }) => {
  const { language } = useApp();
  
  // 从style中提取fontSize并调整
  const getAdjustedStyle = (style: any): any => {
    if (!style) return undefined;
    
    // 处理数组样式
    if (Array.isArray(style)) {
      return style.map(s => {
        if (s && typeof s === 'object' && s.fontSize) {
          return {
            ...s,
            fontSize: language === 'my' ? Math.max(s.fontSize - 2, 10) : s.fontSize
          };
        }
        return s;
      });
    }
    
    // 处理对象样式
    if (typeof style === 'object' && style.fontSize) {
      return {
        ...style,
        fontSize: language === 'my' ? Math.max(style.fontSize - 2, 10) : style.fontSize
      };
    }
    
    return style;
  };
  
  const adjustedStyle = getAdjustedStyle(style);
  
  return (
    <Text style={adjustedStyle} {...props}>
      {children}
    </Text>
  );
};

