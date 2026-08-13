import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";
import { errorService } from "../ErrorService";
import { retry } from "../../utils/retry";
import { buildPricingSettings } from "../_shared/pricing";

// 系统设置服务
export const systemSettingsService = {
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      LoggerService.error("获取系统设置失败:", error);
      return null;
    }
  },

  // 获取计费规则（合并算法见 /shared/src/pricing.ts；默认值与 retry 保留本地）
  async getPricingSettings(region?: string) {
    const defaultSettings = {
      base_fee: 1500,
      per_km_fee: 250,
      weight_surcharge: 150,
      urgent_surcharge: 500,
      scheduled_surcharge: 200,
      oversize_surcharge: 300,
      fragile_surcharge: 300,
      food_beverage_surcharge: 300,
      free_km_threshold: 3,
      way_side_courier_per_order: 0,
    };

    return retry(
      async () => {
        const { data, error } = await supabase
          .from("system_settings")
          .select("settings_key, settings_value")
          .like("settings_key", "pricing.%");

        if (error) throw error;

        return buildPricingSettings(data, region, { defaults: defaultSettings });
      },
      {
        retries: 3,
        delay: 1000,
        shouldRetry: (error) =>
          error.message?.includes("Network request failed") ||
          error.message?.includes("timeout"),
      },
    ).catch((error) => {
      errorService.handleError(error, {
        context: "systemSettingsService.getPricingSettings",
        silent: true,
      });
      return { ...defaultSettings };
    });
  },
};
