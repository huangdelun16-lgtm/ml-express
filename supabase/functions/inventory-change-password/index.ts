import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JwtMeta = {
  userId: string;
  storeId: string;
  storeCode: string;
  hubCode: string;
  sessionId: string;
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
  const sessionId = String(meta.inventory_session_id ?? "").trim();
  if (!storeId || !storeCode || !hubCode || !sessionId) return null;

  return {
    userId: data.user.id,
    storeId,
    storeCode,
    hubCode,
    sessionId,
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
      return new Response(JSON.stringify({ error: "服务暂不可用，请稍后重试" }), {
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

    const { data: changed, error: changeErr } = await admin.rpc(
      "inventory_change_store_password",
      {
        p_store_id: meta.storeId,
        p_current_password: current,
        p_new_password: next,
        p_session_id: meta.sessionId,
      },
    );
    if (changeErr) {
      console.error("inventory-change-password RPC failed", changeErr);
      return new Response(JSON.stringify({ error: "修改密码失败，请稍后重试" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!changed) {
      return new Response(JSON.stringify({ error: "当前密码错误" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateAuthErr } = await admin.auth.admin.updateUserById(meta.userId, {
      password: next,
    });

    if (updateAuthErr) {
      console.error("inventory-change-password Auth update failed", updateAuthErr);
      const { error: rollbackErr } = await admin.rpc("inventory_change_store_password", {
        p_store_id: meta.storeId,
        p_current_password: next,
        p_new_password: current,
        p_session_id: meta.sessionId,
      });
      if (rollbackErr) console.error("inventory-change-password rollback failed", rollbackErr);
      return new Response(JSON.stringify({ error: "修改密码失败，请稍后重试" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, storeCode: meta.storeCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("inventory-change-password unexpected error", error);
    return new Response(
      JSON.stringify({ error: "修改密码失败，请稍后重试" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
