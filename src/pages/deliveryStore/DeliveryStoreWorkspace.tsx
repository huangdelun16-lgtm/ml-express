import { createContext, useContext } from "react";

/**
 * 合伙店铺巨型页拆分用工作区：加载/保存/审核仍在 DeliveryStoreManagement，
 * Overlays 只搬表单与弹窗 JSX。不要在 Overlays 里改 supabase 查询条件。
 */
export type DeliveryStoreWorkspaceValue = Record<string, any>;

const DeliveryStoreWorkspaceContext = createContext<DeliveryStoreWorkspaceValue | null>(
  null,
);

export const DeliveryStoreWorkspaceProvider = DeliveryStoreWorkspaceContext.Provider;

export function useDeliveryStoreWorkspace(): DeliveryStoreWorkspaceValue {
  const ctx = useContext(DeliveryStoreWorkspaceContext);
  if (!ctx) {
    throw new Error("useDeliveryStoreWorkspace 必须在 DeliveryStoreWorkspaceProvider 内使用");
  }
  return ctx;
}
