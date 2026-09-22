/** 中 / 英 / 缅 三语文案。缅语缺失时不要 silently 掉进英文。 */
export function tr3(language: string, zh: string, en: string, my: string): string {
  if (language === 'zh') return zh;
  if (language === 'my') return my;
  return en;
}
