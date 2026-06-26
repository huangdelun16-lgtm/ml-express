-- P3: Admin 跨境物流 overview — 一次 RPC 返回全部统计 + 车费合计

CREATE OR REPLACE FUNCTION public.inventory_admin_overview_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'storeItemsTotal', (SELECT count(*)::bigint FROM inventory_store_items),
    'storeItemsInStock', (
      SELECT count(*)::bigint FROM inventory_store_items WHERE qty_on_hand > 0
    ),
    'packsInTransit', (
      SELECT count(*)::bigint FROM inventory_pkg_tracking WHERE status = 'in_transit'
    ),
    'packsHubReceived', (
      SELECT count(*)::bigint FROM inventory_pkg_tracking WHERE status = 'hub_received'
    ),
    'packsCompleted', (
      SELECT count(*)::bigint FROM inventory_pkg_tracking WHERE status = 'completed'
    ),
    'packsCancelled', (
      SELECT count(*)::bigint FROM inventory_pkg_tracking WHERE status = 'cancelled'
    ),
    'ordersInTransit', (
      SELECT count(*)::bigint FROM inventory_order_tracking WHERE status = 'in_transit'
    ),
    'ordersHubReceived', (
      SELECT count(*)::bigint FROM inventory_order_tracking WHERE status = 'hub_received'
    ),
    'transportFeeTotal', public.inventory_admin_transport_fee_total()
  );
$$;

COMMENT ON FUNCTION public.inventory_admin_overview_stats IS
  'Admin 跨境物流 overview：库存/包裹/订单统计 + 车费合计（单次查询）';

GRANT EXECUTE ON FUNCTION public.inventory_admin_overview_stats() TO service_role;
