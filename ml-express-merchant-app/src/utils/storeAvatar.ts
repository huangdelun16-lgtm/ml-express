import { rewritePublicStorageUrl } from "../services/merchantApi/nativeSupabaseUrl";

export const STORE_AVATAR_UPDATED = "store_avatar_updated";

export function storeAvatarDisplayUri(
  url?: string | null,
  updatedAt?: string | null,
): string | undefined {
  const value = String(url || "").trim();
  if (!value) return undefined;
  if (value.startsWith("file://") || value.startsWith("content://")) return value;
  const rewritten = rewritePublicStorageUrl(value);
  if (!rewritten) return undefined;
  const stamp = String(updatedAt || "").trim();
  if (!stamp) return rewritten;
  return `${rewritten}${rewritten.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}`;
}
