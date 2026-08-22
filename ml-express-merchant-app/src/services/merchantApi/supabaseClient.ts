import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import LoggerService from "../LoggerService";
import {
  applyRealtimeWsFallback,
  nativeClientHeaders,
  resolveNativeSupabaseUrl,
} from "./nativeSupabaseUrl";

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseProxyUrl?: string;
};
const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra) as
  | SupabaseExtra
  | undefined;

// 优先级：EAS Build / 本机 expo start 注入的 EXPO_PUBLIC_* → extra（可选回退，勿在 Git 中提交密钥）
const configuredUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra?.supabaseUrl || extra?.supabaseProxyUrl || "";
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra?.supabaseAnonKey || "";
const constantsAny = Constants as { appOwnership?: string; executionEnvironment?: string };
const isExpoGo =
  constantsAny.appOwnership === "expo" || constantsAny.executionEnvironment === "storeClient";
const allowDirect =
  !isExpoGo && String(process.env.EXPO_PUBLIC_SUPABASE_DIRECT || "").trim() === "1";
const supabaseUrl = resolveNativeSupabaseUrl(configuredUrl, undefined, {
  expoGo: isExpoGo,
  allowDirect,
});
const proxyHeaders = nativeClientHeaders();

// 关键：不要在顶层 throw 错误，这会导致整个 JS Bundle 崩溃，从而出现白屏
if (!supabaseUrl || !supabaseKey) {
  LoggerService.warn(
    "Supabase 未配置：请在 EAS 环境变量或本机 .env 中设置 EXPO_PUBLIC_SUPABASE_URL 与 EXPO_PUBLIC_SUPABASE_ANON_KEY。详见项目内 docs/EAS_ENVIRONMENT_SETUP.txt",
  );
} else {
  try {
    const parsed = new URL(supabaseUrl);
    LoggerService.info("Supabase REST", `${parsed.host}${parsed.pathname}`);
  } catch {
    LoggerService.info("Supabase REST", supabaseUrl);
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
  proxyHeaders
    ? { global: { headers: proxyHeaders }, realtime: { headers: proxyHeaders } }
    : undefined,
);
applyRealtimeWsFallback(supabase);
