import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.1";
import bcrypt from "npm:bcryptjs@2.4.3";

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
  return `SESS_INV_${crypto.randomUUID()}`;
}

type AuthenticatedStore = {
  authenticated: boolean;
  retry_after_seconds: number;
  store_id: string | null;
  store_code: string | null;
  store_name: string | null;
  store_type: string | null;
  store_status: string | null;
  region: string | null;
  address: string | null;
};

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

async function authenticateStoreFallback(
  supabaseAdmin: ReturnType<typeof createClient>,
  code: string,
  password: string,
  sessionId: string,
): Promise<AuthenticatedStore | null> {
  const { data: store, error } = await supabaseAdmin
    .from("delivery_stores")
    .select("id, store_code, store_name, store_type, status, password_hash, region, address")
    .eq("store_code", code)
    .maybeSingle();
  if (error) throw new Error("Inventory account lookup failed");
  if (
    !store ||
    store.store_type !== TRANSIT_STATION_STORE_TYPE ||
    (store.status && store.status !== "active") ||
    !store.password_hash ||
    !bcrypt.compareSync(password, String(store.password_hash))
  ) {
    return null;
  }

  const { error: sessionError } = await supabaseAdmin
    .from("delivery_stores")
    .update({ current_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq("id", store.id);
  if (sessionError) throw new Error("Inventory session update failed");

  return {
    authenticated: true,
    retry_after_seconds: 0,
    store_id: String(store.id),
    store_code: String(store.store_code),
    store_name: String(store.store_name ?? ""),
    store_type: String(store.store_type),
    store_status: store.status ? String(store.status) : null,
    region: store.region ? String(store.region) : null,
    address: store.address ? String(store.address) : null,
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
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "服务暂不可用，请稍后重试" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeCode, password } = await req.json();
    const code = String(storeCode ?? "").trim().toUpperCase();
    const pass = String(password ?? "");
    if (!code || !pass || code.length > 64 || pass.length > 256) {
      return new Response(JSON.stringify({ error: "请填写店铺代码和密码" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const sessionId = createInventorySessionId();
    const { data: authRows, error: authError } = await supabaseAdmin.rpc(
      "inventory_authenticate_store",
      { p_store_code: code, p_password: pass, p_session_id: sessionId },
    );
    let store = (Array.isArray(authRows) ? authRows[0] : authRows) as AuthenticatedStore | null;
    if (authError) {
      console.error("inventory-store-login RPC failed; using hash fallback", authError);
      store = await authenticateStoreFallback(supabaseAdmin, code, pass, sessionId);
    }
    if (!store?.authenticated || !store.store_id || !store.store_code) {
      const coolingDown = Number(store?.retry_after_seconds ?? 0) > 0;
      return new Response(JSON.stringify({ error: "店铺代码或密码错误，请稍后重试" }), {
        status: coolingDown ? 429 : 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...(coolingDown
            ? { "Retry-After": String(Math.max(1, store?.retry_after_seconds ?? 1)) }
            : {}),
        },
      });
    }

    const hubCode = resolveHubCode(store.region, store.store_code);
    const email = inventoryAuthEmail(store.store_code);
    const appMetadata = {
      inventory_store_id: store.store_id,
      inventory_store_code: String(store.store_code).trim().toUpperCase(),
      inventory_hub_code: hubCode,
      inventory_session_id: sessionId,
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
        console.error("inventory-store-login Auth update failed", updateError);
        return new Response(JSON.stringify({ error: "登录失败，请稍后重试" }), {
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
        console.error("inventory-store-login Auth create failed", createError);
        return new Response(JSON.stringify({ error: "登录失败，请稍后重试" }), {
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
          id: store.store_id,
          storeCode: String(store.store_code).trim().toUpperCase(),
          storeName: store.store_name,
          region: (store.region ?? "").trim(),
          address: (store.address ?? "").trim(),
          storeType: store.store_type ?? TRANSIT_STATION_STORE_TYPE,
        },
        hubCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("inventory-store-login unexpected error", error);
    return new Response(
      JSON.stringify({ error: "登录失败，请稍后重试" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
