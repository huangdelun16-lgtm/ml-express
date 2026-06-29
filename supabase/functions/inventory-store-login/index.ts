import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TRANSIT_STATION_STORE_TYPE = "transit_station";
const PACK_HUB_CODES = ["MSE", "LSO", "POL", "MDY", "YGN", "TGI"];

function inventoryAuthEmail(storeCode: string): string {
  return `inventory+${storeCode.trim().toLowerCase()}@inventory.mlexpress.internal`;
}

function createInventorySessionId(): string {
  return `SESS_INV_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveHubCode(region: string | null | undefined, storeCode: string): string {
  const reg = (region ?? "").trim().toUpperCase();
  if (reg && PACK_HUB_CODES.includes(reg)) return reg;

  const letters = storeCode.replace(/[0-9]/g, "").toUpperCase();
  if (letters.startsWith("MUSE") || letters === "MSE" || letters === "MUS") return "MSE";

  const prefix = letters.slice(0, 3);
  if (PACK_HUB_CODES.includes(prefix)) return prefix;
  if (reg && PACK_HUB_CODES.includes(reg.slice(0, 3))) return reg.slice(0, 3);
  if (reg) return reg.slice(0, 3);
  return prefix;
}

async function findUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string } | null> {
  let page = 1;
  const perPage = 1000;
  const target = email.toLowerCase();
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((user) => (user.email ?? "").toLowerCase() === target);
    if (match) return { id: match.id };
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Supabase Service Role 未配置" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeCode, password } = await req.json();
    const code = String(storeCode ?? "").trim().toUpperCase();
    const pass = String(password ?? "").trim();
    if (!code || !pass) {
      return new Response(JSON.stringify({ error: "请填写店铺代码和密码" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: store, error: storeError } = await supabaseAdmin
      .from("delivery_stores")
      .select("id, store_code, store_name, store_type, status, password, region, address")
      .eq("store_code", code)
      .maybeSingle();

    if (storeError) {
      return new Response(JSON.stringify({ error: storeError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!store) {
      return new Response(JSON.stringify({ error: "店铺代码不存在" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (String(store.password ?? "").trim() !== pass) {
      return new Response(JSON.stringify({ error: "密码错误" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (store.store_type !== TRANSIT_STATION_STORE_TYPE) {
      return new Response(JSON.stringify({ error: "仅中转站合伙店铺可登录 Inventory App" }), {
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

    const hubCode = resolveHubCode(store.region, store.store_code);
    const sessionId = createInventorySessionId();
    const { error: sessionError } = await supabaseAdmin
      .from("delivery_stores")
      .update({ current_session_id: sessionId })
      .eq("id", store.id);
    if (sessionError) {
      return new Response(JSON.stringify({ error: sessionError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = inventoryAuthEmail(store.store_code);
    const appMetadata = {
      inventory_store_id: store.id,
      inventory_store_code: String(store.store_code).trim().toUpperCase(),
      inventory_hub_code: hubCode,
      inventory_store_type: TRANSIT_STATION_STORE_TYPE,
      inventory_store_name: store.store_name,
      inventory_region: (store.region ?? "").trim(),
      inventory_address: (store.address ?? "").trim(),
    };

    const existing = await findUserByEmail(supabaseAdmin, email);
    if (existing) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: pass,
        email_confirm: true,
        app_metadata: appMetadata,
      });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        app_metadata: appMetadata,
      });
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        email,
        sessionId,
        store: {
          id: store.id,
          storeCode: String(store.store_code).trim().toUpperCase(),
          storeName: store.store_name,
          region: (store.region ?? "").trim(),
          address: (store.address ?? "").trim(),
          storeType: store.store_type,
        },
        hubCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "登录失败" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
