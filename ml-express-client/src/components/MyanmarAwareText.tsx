import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import {
  containsMyanmarText,
  myanmarFontStyle,
  splitTextRuns,
  MYANMAR_FONT_REGULAR,
} from '../utils/myanmarText';

type Props = TextProps & {
  /** 纯字符串内容；与 children 二选一，优先 text */
  text?: string | null;
  myanmarWeight?: 'regular' | 'semibold' | 'bold';
};

/**
 * 自动为 Unicode 缅文段落套用 Noto Sans Myanmar，与 Mac / Web 端 Unicode 输入一致。
 */
export default function MyanmarAwareText({
  text,
  children,
  style,
  myanmarWeight = 'regular',
  ...rest
}: Props) {
  const content =
    text ??
    (typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : null);

  if (content == null) {
    return (
      <Text style={style} {...rest}>
        {children}
      </Text>
    );
  }

  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseLineHeight = flatStyle?.lineHeight;

  if (!containsMyanmarText(content)) {
    return (
      <Text style={style} {...rest}>
        {content}
      </Text>
    );
  }

  const runs = splitTextRuns(content);
  if (runs.length <= 1) {
    const mmStyle = myanmarFontStyle(content, myanmarWeight);
    return (
      <Text
        style={[style, mmStyle, baseLineHeight ? { lineHeight: baseLineHeight } : null]}
        {...rest}
      >
        {content}
      </Text>
    );
  }

  return (
    <Text style={style} {...rest}>
      {runs.map((run, index) =>
        run.myanmar ? (
          <Text
            key={`mm-${index}`}
            style={{
              fontFamily: myanmarFontStyle(run.text, myanmarWeight)?.fontFamily ?? MYANMAR_FONT_REGULAR,
              lineHeight: baseLineHeight ?? 24,
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
