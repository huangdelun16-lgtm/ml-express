import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import {
  containsMyanmarText,
  myanmarCompatStyle,
  myanmarFontStyle,
  myanmarTypeAdjust,
  splitTextRuns,
  MYANMAR_FONT_REGULAR,
} from '../utils/myanmarText';

type Props = TextProps & {
  myanmarWeight?: 'regular' | 'semibold' | 'bold';
  /** 条码等必须单行时再打开，默认缅文允许多行以免裁切 */
  clipMyanmar?: boolean;
};

export default function AppText({
  children,
  style,
  myanmarWeight = 'regular',
  clipMyanmar = false,
  numberOfLines,
  ...rest
}: Props) {
  const { language } = useLanguage();
  const forceMyanmar = language === 'my';
  const content =
    typeof children === 'string' || typeof children === 'number' ? String(children) : null;
  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const useMyanmarType =
    forceMyanmar || (content != null && containsMyanmarText(content));
  const typeAdjust = useMyanmarType ? myanmarTypeAdjust(flatStyle) : undefined;
  const scaledLineHeight = typeAdjust?.lineHeight ?? flatStyle?.lineHeight;
  const resolvedLines =
    useMyanmarType && !clipMyanmar && numberOfLines === 1 ? 3 : numberOfLines;

  if (content == null) {
    const wrapFont = forceMyanmar
      ? { fontFamily: myanmarFontStyle('', myanmarWeight, true)?.fontFamily }
      : undefined;
    return (
      <Text
        style={[style, wrapFont, forceMyanmar ? myanmarCompatStyle(myanmarWeight) : null, typeAdjust]}
        numberOfLines={resolvedLines}
        {...rest}
      >
        {children}
      </Text>
    );
  }

  if (!forceMyanmar && !containsMyanmarText(content)) {
    return (
      <Text style={style} numberOfLines={numberOfLines} {...rest}>
        {content}
      </Text>
    );
  }

  const runs = splitTextRuns(content);
  if (forceMyanmar || runs.length <= 1) {
    const mmStyle = myanmarFontStyle(content, myanmarWeight, true);
    const compat = myanmarCompatStyle(myanmarWeight);
    return (
      <Text
        style={[style, mmStyle, compat, typeAdjust, scaledLineHeight ? { lineHeight: scaledLineHeight } : null]}
        numberOfLines={resolvedLines}
        {...rest}
      >
        {content}
      </Text>
    );
  }

  return (
    <Text style={[style, typeAdjust]} numberOfLines={resolvedLines} {...rest}>
      {runs.map((run, index) =>
        run.myanmar ? (
          <Text
            key={`mm-${index}`}
            style={{
              fontFamily: myanmarFontStyle(run.text, myanmarWeight)?.fontFamily ?? MYANMAR_FONT_REGULAR,
              lineHeight: scaledLineHeight ?? 22,
              ...myanmarCompatStyle(myanmarWeight),
            }}
          >
            {run.text}
          </Text>
        ) : (
          <Text key={`other-${index}`}>{run.text}</Text>
        ),
      )}
    </Text>
  );
}
