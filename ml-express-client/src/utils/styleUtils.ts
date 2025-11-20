/**
 * 样式工具函数
 * 根据语言调整字体大小（缅语缩小2px）
 */

/**
 * 根据语言调整字体大小
 * @param baseSize 基础字体大小
 * @param language 当前语言
 * @returns 调整后的字体大小
 */
export const getFontSize = (baseSize: number, language?: string): number => {
  if (language === 'my') {
    return Math.max(baseSize - 2, 10); // 最小字体大小为10px
  }
  return baseSize;
};

/**
 * 根据语言调整样式对象中的字体大小
 * @param style 样式对象
 * @param language 当前语言
 * @returns 调整后的样式对象
 */
export const adjustStyleForLanguage = (style: any, language?: string): any => {
  if (language !== 'my' || !style) {
    return style;
  }
  
  // 如果是数组，递归处理
  if (Array.isArray(style)) {
    return style.map(s => adjustStyleForLanguage(s, language));
  }
  
  // 如果是对象且有fontSize，调整它
  if (typeof style === 'object' && style.fontSize) {
    return {
      ...style,
      fontSize: Math.max(style.fontSize - 2, 10)
    };
  }
  
  return style;
};

/**
 * 创建根据语言调整的样式表
 * @param styles StyleSheet样式对象
 * @param language 当前语言
 * @returns 调整后的样式对象
 */
export const createLanguageAwareStyles = (styles: any, language?: string): any => {
  if (language !== 'my') {
    return styles;
  }
  
  const adjustedStyles: any = {};
  
  for (const key in styles) {
    const style = styles[key];
    adjustedStyles[key] = adjustStyleForLanguage(style, language);
  }
  
  return adjustedStyles;
};

