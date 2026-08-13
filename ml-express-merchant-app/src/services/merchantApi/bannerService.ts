import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";
import { createBannerService } from "../_shared/services";

// 广告服务
// bannerService.getActiveBanners 实现见 /shared/src/services.ts（工厂注入 client + logger）
export const bannerService = createBannerService(supabase, LoggerService);
