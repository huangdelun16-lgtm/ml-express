/**
 * 全应用所有 useJsApiLoader 必须使用相同的 libraries（及相同顺序），
 * 否则在页面间切换时会报错：
 * Loader must not be called again with different options
 *
 * RealTimeTracking 需要 visualization（热力图等）；其余页面至少需 places。
 * 统一加载 superset，避免重复注入脚本时参数不一致。
 */
export const GOOGLE_MAPS_LIBRARIES: Array<"places" | "visualization"> = [
  "places",
  "visualization",
];
