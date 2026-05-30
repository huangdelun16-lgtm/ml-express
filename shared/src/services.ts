// 跨端共享的只读数据服务工厂（多端共享单一源）
//
// 单一真源：/shared/src/services.ts
// 各 app 通过 sync 脚本复制到 _shared/ 后引用，请勿在副本中修改。
//
// 设计：service 依赖各端不同的 supabase client 与 logger，故用工厂函数注入，
// 返回与各端原 service 形态一致的对象（对外 API 不变）。
// 仅收录各端**完全一致**的只读方法；含 CRUD/差异方法的 service（如 admin
// bannerService、各端 reviewService）形态不同，保留在各 app 本地。

import type { Banner, Tutorial } from "./domainTypes";

/** 结构化最小依赖：与 @supabase/supabase-js 的 client 兼容 */
export type SupabaseLike = {
  from: (table: string) => any;
};

export type SharedLogger = {
  error: (...args: any[]) => void;
};

/** 广告：仅 getActiveBanners（客户端/商家 web/app 一致） */
export function createBannerService(supabase: SupabaseLike, logger: SharedLogger) {
  return {
    async getActiveBanners(): Promise<Banner[]> {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) {
          logger.error("获取广告列表失败:", error);
          return [];
        }
        return (data || []) as Banner[];
      } catch (error) {
        logger.error("获取广告列表异常:", error);
        return [];
      }
    },
  };
}

/** 教学：仅 getAllTutorials（客户端/商家 web/app 一致） */
export function createTutorialService(supabase: SupabaseLike, logger: SharedLogger) {
  return {
    async getAllTutorials(): Promise<Tutorial[]> {
      try {
        const { data, error } = await supabase
          .from("tutorials")
          .select("*")
          .order("display_order", { ascending: true });

        if (error) {
          logger.error("获取教学列表失败:", error);
          return [];
        }
        return (data || []) as Tutorial[];
      } catch (err) {
        logger.error("获取教学列表异常:", err);
        return [];
      }
    },
  };
}
