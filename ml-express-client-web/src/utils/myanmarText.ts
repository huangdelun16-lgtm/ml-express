import type { CSSProperties } from 'react';

export const MYANMAR_CHAR_RE = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

export const MYANMAR_FONT_FAMILY =
  "'Noto Sans Myanmar', 'Pyidaungsu', 'Myanmar Text', 'Padauk', sans-serif";

export function containsMyanmarText(text?: string | null): boolean {
  if (!text) return false;
  return MYANMAR_CHAR_RE.test(text);
}

export function myanmarTextCss(text?: string | null): CSSProperties | undefined {
  if (!containsMyanmarText(text)) return undefined;
  return {
    fontFamily: MYANMAR_FONT_FAMILY,
    lineHeight: 1.65,
  };
}
