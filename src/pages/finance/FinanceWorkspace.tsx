import { createContext, useContext } from "react";

/**
 * 财务巨型页拆分用工作区：数据加载、结清/发工资等仍在 FinanceManagement，
 * 各 Tab 只搬 JSX。不要在 Tab 里新增 supabase 查询条件。
 */
export type FinanceWorkspaceValue = Record<string, any>;

const FinanceWorkspaceContext = createContext<FinanceWorkspaceValue | null>(
  null,
);

export const FinanceWorkspaceProvider = FinanceWorkspaceContext.Provider;

export function useFinanceWorkspace(): FinanceWorkspaceValue {
  const ctx = useContext(FinanceWorkspaceContext);
  if (!ctx) {
    throw new Error("useFinanceWorkspace 必须在 FinanceWorkspaceProvider 内使用");
  }
  return ctx;
}
