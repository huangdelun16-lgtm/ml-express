import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import {
  containsMyanmarText,
  myanmarFontStyle,
  splitTextRuns,
  MYANMAR_FONT_REGULAR,
} from '../utils/myanmarText';

type Props = TextProps & {
  myanmarWeight?: 'regular' | 'semibold' | 'bold';
};

export default function AppText({
  children,
  style,
  myanmarWeight = 'regular',
  ...rest
}: Props) {
  const { language } = useLanguage();
  const forceMyanmar = language === 'my';
  const content =
    typeof children === 'string' || typeof children === 'number' ? String(children) : null;
  const flatStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseLineHeight = flatStyle?.lineHeight;

  if (content == null) {
    const wrapFont = forceMyanmar
      ? { fontFamily: myanmarFontStyle('', myanmarWeight, true)?.fontFamily }
      : undefined;
    return (
      <Text style={[style, wrapFont]} {...rest}>
        {children}
      </Text>
    );
  }

  if (!forceMyanmar && !containsMyanmarText(content)) {
    return (
      <Text style={style} {...rest}>
        {content}
      </Text>
    );
  }

  const runs = splitTextRuns(content);
  if (forceMyanmar || runs.length <= 1) {
    const mmStyle = myanmarFontStyle(content, myanmarWeight, true);
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
