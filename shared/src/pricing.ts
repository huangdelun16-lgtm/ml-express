// 计费规则合并逻辑与领区解析（多端共享单一源）
//
// 单一真源：/shared/src/pricing.ts
// 各 app 通过 sync 脚本复制到 src/services/_shared/ 后引用，请勿在副本中修改。
//
// 设计：仅共享「合并算法 + 领区解析」这类纯逻辑。
// 各 app 的默认值对象、retry/错误处理、输出键风格（snake/camel）保留在各自包装函数中，
// 通过 opts.defaults / opts.toField 注入，从而行为与各端原实现完全一致。

export const DEFAULT_PRICING_REGION_FALLBACK = "mandalay";

export const PRICING_REGION_IDS = [
  "mandalay",
  "maymyo",
  "yangon",
  "naypyidaw",
  "taunggyi",
  "lashio",
  "muse",
  "ruili",
] as const;

export type PricingRegionId = (typeof PRICING_REGION_IDS)[number];

const PRICING_REGION_ID_SET = new Set<string>(PRICING_REGION_IDS);

/** 订单 ID / 用户名前缀 → 领区 ID */
export const PACKAGE_PREFIX_TO_REGION: Record<string, string> = {
  MDY: "mandalay",
  POL: "maymyo",
  YGN: "yangon",
  NPW: "naypyidaw",
  TGI: "taunggyi",
  LSO: "lashio",
  MUSE: "muse",
  MSE: "muse",
  RUILI: "ruili",
  RUI: "ruili",
};

/** pricing.base_fee 这类「全局」键（2 段）；pricing.{region}.base_fee 为领区键（3 段） */
export function isGlobalPricingKey(settingsKey: string): boolean {
  const parts = settingsKey.split(".");
  return parts.length === 2 && parts[0] === "pricing";
}

/** settings_value 可能是 number / 字符串 / { value } 包裹，统一解析为数字 */
export function parsePricingSettingValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && raw !== null && "value" in (raw as object)) {
    return parsePricingSettingValue((raw as { value: unknown }).value);
  }
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return parsePricingSettingValue(j);
    } catch {
      return parseFloat(raw) || 0;
    }
  }
  return 0;
}

/** snake_case 字段名 → camelCase（client-web 输出风格） */
export function pricingFieldToCamel(rawKey: string): string {
  return rawKey.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
}

export type PricingSettingRow = {
  settings_key: string;
  settings_value: unknown;
};

export type BuildPricingOptions<T extends Record<string, number>> = {
  /** 各 app 自带的默认值对象（键风格需与 toField 输出一致） */
  defaults: T;
  /** DB 字段（snake_case）→ 输出键映射；缺省为原样（snake_case） */
  toField?: (field: string) => string;
};

/**
 * 合并计费规则：默认值 → 全局 pricing.* → 领区 pricing.{region}.* 覆盖。
 * 与 Admin「计费规则」保存格式一致；未指定领区时回退曼德勒，
 * 避免库中残留旧的全局值挡住 Admin 在领区里改过的价格。
 */
export function buildPricingSettings<T extends Record<string, number>>(
  rows: PricingSettingRow[] | null | undefined,
  region: string | undefined,
  opts: BuildPricingOptions<T>,
): T {
  const toField = opts.toField ?? ((f: string) => f);
  const settings: Record<string, number> = { ...opts.defaults };

  if (rows && rows.length > 0) {
    rows.forEach((item) => {
      if (!isGlobalPricingKey(item.settings_key)) return;
      const field = item.settings_key.replace("pricing.", "");
      settings[toField(field)] = parsePricingSettingValue(item.settings_value);
    });

    const regionalPrefix = region
      ? `pricing.${region.toLowerCase()}.`
      : `pricing.${DEFAULT_PRICING_REGION_FALLBACK}.`;

    rows.forEach((item) => {
      if (!item.settings_key.startsWith(regionalPrefix)) return;
      const field = item.settings_key.slice(regionalPrefix.length);
      settings[toField(field)] = parsePricingSettingValue(item.settings_value);
    });
  }

  return settings as T;
}

function normalizePackageRegionField(raw?: string | null): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase();
  if (PRICING_REGION_ID_SET.has(s)) return s;
  const aliases: Record<string, string> = {
    mdy: "mandalay",
    ygn: "yangon",
    pol: "maymyo",
    npw: "naypyidaw",
    tgi: "taunggyi",
    lso: "lashio",
    muse: "muse",
    mse: "muse",
    ruili: "ruili",
    rui: "ruili",
  };
  const mapped = aliases[s];
  return mapped && PRICING_REGION_ID_SET.has(mapped) ? mapped : null;
}

/** 订单计费领区：与 Admin / 财务一致 */
export function resolvePackagePricingRegionId(pkg: {
  id?: string;
  region?: string | null;
}): string {
  const fromField = normalizePackageRegionField(pkg.region);
  if (fromField) return fromField;
  const id = (pkg.id || "").toUpperCase();
  for (const [prefix, rid] of Object.entries(PACKAGE_PREFIX_TO_REGION)) {
    if (id.startsWith(prefix)) return rid;
  }
  return DEFAULT_PRICING_REGION_FALLBACK;
}

export function getRegionalPricingForPackage(
  pkg: { id?: string; region?: string | null },
  map: Record<string, Record<string, number>>,
): Record<string, number> {
  const rid = resolvePackagePricingRegionId(pkg);
  return map[rid] || map[DEFAULT_PRICING_REGION_FALLBACK] || {};
}

/** 骑手账号所属领区（登录时写入 AsyncStorage pricingRegionId） */
export function resolveRiderPricingRegionId(
  accountRegion?: string | null,
  username?: string | null,
): string {
  const fromAccount = normalizePackageRegionField(accountRegion);
  if (fromAccount) return fromAccount;
  const u = (username || "").toUpperCase();
  for (const [prefix, rid] of Object.entries(PACKAGE_PREFIX_TO_REGION)) {
    if (u.startsWith(prefix)) return rid;
  }
  return DEFAULT_PRICING_REGION_FALLBACK;
}
