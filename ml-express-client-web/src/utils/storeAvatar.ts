import { publicStorageUrl } from "./supabaseBrowserUrl";

export function storeAvatarSrc(
  url?: string | null,
  updatedAt?: string | null,
): string | undefined {
  const base = publicStorageUrl(url);
  if (!base) return undefined;
  const stamp = String(updatedAt || "").trim();
  if (!stamp) return base;
  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}`;
}
