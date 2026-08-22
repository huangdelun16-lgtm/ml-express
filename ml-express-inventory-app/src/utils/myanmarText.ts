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

export function myanmarFontStyle(
  text?: string | null,
  weight: 'regular' | 'semibold' | 'bold' = 'regular',
  force = false,
): Pick<TextStyle, 'fontFamily' | 'lineHeight'> | undefined {
  if (!force && !containsMyanmarText(text)) return undefined;
  const fontFamily =
    weight === 'bold'
      ? MYANMAR_FONT_BOLD
      : weight === 'semibold'
        ? MYANMAR_FONT_SEMIBOLD
        : MYANMAR_FONT_REGULAR;
  return { fontFamily, lineHeight: 28 };
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
