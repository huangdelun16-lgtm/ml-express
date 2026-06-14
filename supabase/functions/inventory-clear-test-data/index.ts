import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JwtMeta = {
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
  return { storeId, storeCode, hubCode };
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

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { storeId, storeCode, hubCode } = meta;

    const { data: visibleItems, error: visibleErr } = await admin
      .from("inventory_store_items")
      .select("id, barcode")
      .or(
        `owner_store_id.eq.${storeId},owner_store_code.eq.${storeCode},final_destination.eq.${hubCode}`,
      );
    if (visibleErr) throw new Error(visibleErr.message);

    const itemIds = (visibleItems ?? []).map((row) => String((row as { id: string }).id));
    const orderBarcodes = (visibleItems ?? [])
      .map((row) => String((row as { barcode: string }).barcode).trim())
      .filter(Boolean);

    if (orderBarcodes.length > 0) {
      const { error: orderByBarcodeErr } = await admin
        .from("inventory_order_tracking")
        .delete()
        .in("order_barcode", orderBarcodes);
      if (orderByBarcodeErr) throw new Error(orderByBarcodeErr.message);
    }

    const { count: orderCount, error: orderErr } = await admin
      .from("inventory_order_tracking")
      .delete({ count: "exact" })
      .or(`destination_code.eq.${hubCode},hub_received_by_store_code.eq.${storeCode}`);
    if (orderErr) throw new Error(orderErr.message);

    const { count: packTrackCount, error: packTrackErr } = await admin
      .from("inventory_pkg_tracking")
      .delete({ count: "exact" })
      .or(
        `origin_store_id.eq.${storeId},origin_store_code.eq.${storeCode},leg_destination_code.eq.${hubCode},destination_code.eq.${hubCode},hub_received_by_store_code.eq.${storeCode}`,
      );
    if (packTrackErr) throw new Error(packTrackErr.message);

    const { count: packedCount, error: packedErr } = await admin
      .from("inventory_packed_shipments")
      .delete({ count: "exact" })
      .or(`owner_store_id.eq.${storeId},owner_store_code.eq.${storeCode}`);
    if (packedErr) throw new Error(packedErr.message);

    let itemCount = 0;
    if (itemIds.length > 0) {
      const { count, error: itemErr } = await admin
        .from("inventory_store_items")
        .delete({ count: "exact" })
        .in("id", itemIds);
      if (itemErr) throw new Error(itemErr.message);
      itemCount = count ?? 0;
    }

    return new Response(
      JSON.stringify({
        items: itemCount,
        packs: packedCount ?? 0,
        trackingPacks: packTrackCount ?? 0,
        trackingOrders: orderCount ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "清空失败" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
