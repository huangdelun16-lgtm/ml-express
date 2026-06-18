import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TRANSIT_STATION_STORE_TYPE = "transit_station";

type JwtMeta = {
  userId: string;
  storeId: string;
  storeCode: string;
  hubCode: string;
};

async function readMetaFromJwt(
  authHeader: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<JwtMeta | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  const meta = data.user.app_metadata ?? {};
  const storeId = String(meta.inventory_store_id ?? "").trim();
  const storeCode = String(meta.inventory_store_code ?? "").trim().toUpperCase();
  const hubCode = String(meta.inventory_hub_code ?? "").trim().toUpperCase();
  if (!storeId || !storeCode || !hubCode) return null;

  return {
    userId: data.user.id,
    storeId,
    storeCode,
    hubCode,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Supabase 环境未配置" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const meta = await readMetaFromJwt(authHeader, supabaseUrl, anonKey);
    if (!meta) {
      return new Response(JSON.stringify({ error: "请先登录 Inventory App（无效或未授权）" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { currentPassword, newPassword } = await req.json();
    const current = String(currentPassword ?? "").trim();
    const next = String(newPassword ?? "").trim();

    if (!current || !next) {
      return new Response(JSON.stringify({ error: "请填写当前密码和新密码" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (next.length < 6) {
      return new Response(JSON.stringify({ error: "新密码至少 6 位" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (current === next) {
      return new Response(JSON.stringify({ error: "新密码不能与当前密码相同" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: store, error: storeErr } = await admin
      .from("delivery_stores")
      .select("id, store_code, store_type, status, password")
      .eq("id", meta.storeId)
      .maybeSingle();

    if (storeErr) {
      return new Response(JSON.stringify({ error: storeErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!store) {
      return new Response(JSON.stringify({ error: "店铺不存在" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (store.store_type !== TRANSIT_STATION_STORE_TYPE) {
      return new Response(JSON.stringify({ error: "仅中转站账号可修改密码" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (store.status && store.status !== "active") {
      return new Response(JSON.stringify({ error: `账号状态异常（${store.status}）` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (String(store.password ?? "").trim() !== current) {
      return new Response(JSON.stringify({ error: "当前密码错误" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateStoreErr } = await admin
      .from("delivery_stores")
      .update({ password: next, updated_at: new Date().toISOString() })
      .eq("id", meta.storeId);

    if (updateStoreErr) {
      return new Response(JSON.stringify({ error: updateStoreErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateAuthErr } = await admin.auth.admin.updateUserById(meta.userId, {
      password: next,
    });

    if (updateAuthErr) {
      // 回滚店铺密码
      await admin
        .from("delivery_stores")
        .update({ password: current, updated_at: new Date().toISOString() })
        .eq("id", meta.storeId);
      return new Response(JSON.stringify({ error: updateAuthErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, storeCode: meta.storeCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "修改密码失败" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
