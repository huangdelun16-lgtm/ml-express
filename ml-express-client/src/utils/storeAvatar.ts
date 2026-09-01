import { remoteImageUri } from "../services/clientApi/nativeSupabaseUrl";

export function storeAvatarDisplayUri(
  url?: string | null,
  updatedAt?: string | null,
): string | undefined {
  const value = String(url || "").trim();
  if (!value) return undefined;
  const rewritten = remoteImageUri(value);
  if (!rewritten) return undefined;
  const stamp = String(updatedAt || "").trim();
  if (!stamp) return rewritten;
  return `${rewritten}${rewritten.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}`;
}
