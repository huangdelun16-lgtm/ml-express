import { TextStyle } from 'react-native';

/** Unicode Myanmar block + extensions (Unicode Myanmar, not Zawgyi) */
export const MYANMAR_CHAR_RE = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

export const MYANMAR_FONT_REGULAR = 'NotoSansMyanmar_400Regular';
export const MYANMAR_FONT_SEMIBOLD = 'NotoSansMyanmar_600SemiBold';
export const MYANMAR_FONT_BOLD = 'NotoSansMyanmar_700Bold';

export function containsMyanmarText(text?: string | null): boolean {
  if (!text) return false;
  return MYANMAR_CHAR_RE.test(text);
}

/** 缅文版相对中文/英文缩小两号，避免 Noto Myanmar 撑爆表单 */
export const MYANMAR_FONT_SIZE_STEP = 2;

export function myanmarFontStyle(
  text?: string | null,
  weight: 'regular' | 'semibold' | 'bold' = 'regular',
  force = false,
): Pick<TextStyle, 'fontFamily'> | undefined {
  if (!force && !containsMyanmarText(text)) return undefined;
  const fontFamily =
    weight === 'bold'
      ? MYANMAR_FONT_BOLD
      : weight === 'semibold'
        ? MYANMAR_FONT_SEMIBOLD
        : MYANMAR_FONT_REGULAR;
  return { fontFamily };
}

/** 自定义缅文字体不能叠 800/900 字重，否则 iOS 会回退系统字体并把字形叠在一起 */
export function myanmarCompatStyle(
  weight: 'regular' | 'semibold' | 'bold' = 'regular',
): Pick<TextStyle, 'fontWeight' | 'letterSpacing'> {
  return {
    fontWeight: weight === 'bold' ? '700' : weight === 'semibold' ? '600' : '400',
    letterSpacing: 0,
  };
}

export function myanmarTypeAdjust(base?: TextStyle): TextStyle | undefined {
  const next: TextStyle = { includeFontPadding: true };
  if (typeof base?.fontSize === 'number') {
    next.fontSize = Math.max(base.fontSize - MYANMAR_FONT_SIZE_STEP, 10);
  }
  const readableLine =
    typeof next.fontSize === 'number' ? Math.round(next.fontSize * 1.85) : undefined;
  if (readableLine != null) {
    next.lineHeight = Math.max(
      readableLine,
      typeof base?.lineHeight === 'number' ? base.lineHeight : 0,
    );
  } else if (typeof base?.lineHeight === 'number') {
    next.lineHeight = Math.max(base.lineHeight, 22);
  }
  return next;
}

export type TextRun = { text: string; myanmar: boolean };

export function splitTextRuns(text: string): TextRun[] {
  if (!text) return [];
  const runs: TextRun[] = [];
  let buf = '';
  let isMyanmar: boolean | null = null;

  for (const char of text) {
    const charIsMyanmar = MYANMAR_CHAR_RE.test(char);
    if (isMyanmar !== null && charIsMyanmar !== isMyanmar) {
      runs.push({ text: buf, myanmar: isMyanmar });
      buf = '';
    }
    buf += char;
    isMyanmar = charIsMyanmar;
  }
  if (buf) runs.push({ text: buf, myanmar: !!isMyanmar });
  return runs;
}
