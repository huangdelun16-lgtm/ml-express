// 余额充值 QR 配置（多端共享单一源）
//
// 单一真源：/shared/src/rechargeQr.ts
// 各 app 通过 sync 脚本复制到 src/services/_shared/ 后引用，请勿在副本中修改。
//
// 注意：默认 QR 图地址各端不同（Web 用相对路径、App 用绝对域名），
// 因此 getDefaultRechargeQrUrlMap 保留在各 app 本地，这里只共享 key、档位与合并算法。

/** 与 Admin 广告管理「余额充值 QR」、各端共用的 system_settings 键 */
export const CLIENT_RECHARGE_QR_SETTING_KEY = "client.recharge_qr_urls";

export const RECHARGE_QR_AMOUNT_TIERS = [
  10000, 50000, 100000, 300000, 500000, 1000000,
] as const;

/**
 * 合并默认 QR 图与 Supabase 配置（settings_value）。
 * raw 可能是对象或 JSON 字符串；非法时返回默认副本。
 */
export function mergeRechargeQrUrlMap(
  defaults: Record<number, string>,
  rawSettingsValue: unknown,
): Record<number, string> {
  let raw: unknown = rawSettingsValue;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ...defaults };
    }
  }
  if (!raw || typeof raw !== "object") return { ...defaults };

  const merged = { ...defaults };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(k);
    if (Number.isFinite(n) && typeof v === "string" && v.trim()) {
      merged[n] = v.trim();
    }
  }
  return merged;
}
