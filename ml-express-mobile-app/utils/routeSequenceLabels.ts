/** 路线顺序标签：A, B, C … Z, AA, AB … */
export function sequenceLabelForIndex(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return `${String.fromCharCode(65 + first)}${String.fromCharCode(65 + second)}`;
}
