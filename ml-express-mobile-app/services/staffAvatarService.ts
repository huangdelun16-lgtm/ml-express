import { Platform } from "react-native";
import { supabase } from "./staffApi/supabaseClient";
import { rewritePublicStorageUrl } from "./staffApi/nativeSupabaseUrl";
import { logger } from "./LoggerService";

const AVATAR_BUCKETS = ["product_images", "review_images"] as const;

function avatarPath(ownerId: string) {
  return `courier-avatars/${ownerId}.jpg`;
}

function isMissingAvatarColumn(error: any): boolean {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`;
  return /avatar_url|PGRST204|schema cache/i.test(text);
}

function publicUrlFor(bucket: string, path: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return rewritePublicStorageUrl(String(publicUrl || "").trim());
}

async function readLocalImageBytes(imageUri: string): Promise<Uint8Array> {
  let formattedUri = imageUri;
  if (!imageUri.startsWith("file://") && !imageUri.startsWith("content://")) {
    formattedUri = Platform.OS === "ios" ? `file://${imageUri}` : imageUri;
  }
  const response = await fetch(formattedUri);
  const blob = await response.blob();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  const bytes = new Uint8Array(arrayBuffer);
  if (!bytes.length) throw new Error("empty avatar");
  return bytes;
}

export function staffAvatarDisplayUri(
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

export async function uploadStaffAvatar(
  imageUri: string,
  ownerId: string,
): Promise<string | null> {
  try {
    if (!imageUri || !ownerId) throw new Error("missing avatar upload args");
    const bytes = await readLocalImageBytes(imageUri);
    let lastError: unknown = null;
    const fileName = avatarPath(ownerId);

    for (const bucket of AVATAR_BUCKETS) {
      const { error } = await supabase.storage.from(bucket).upload(fileName, bytes, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "60",
      });
      if (error) {
        lastError = error;
        logger.warn(`骑手头像上传到 ${bucket}/${fileName} 失败:`, error);
        continue;
      }
      return publicUrlFor(bucket, fileName);
    }
    throw lastError || new Error("staff avatar upload failed");
  } catch (error) {
    logger.error("上传骑手头像失败:", error);
    return null;
  }
}

export async function saveStaffAvatarUrl(opts: {
  accountId?: string | null;
  courierId?: string | null;
  url: string;
}): Promise<{ success: boolean; missingColumn?: boolean }> {
  const { accountId, courierId, url } = opts;
  let missingColumn = false;
  let wrote = false;

  if (courierId) {
    const { error } = await supabase
      .from("couriers")
      .update({ avatar_url: url })
      .eq("id", courierId);
    if (error) {
      if (isMissingAvatarColumn(error)) missingColumn = true;
      else logger.warn("保存 couriers.avatar_url 失败:", error);
    } else {
      wrote = true;
    }
  }

  if (accountId) {
    const { error } = await supabase
      .from("admin_accounts")
      .update({ avatar_url: url })
      .eq("id", accountId);
    if (error) {
      if (isMissingAvatarColumn(error)) missingColumn = true;
      else logger.warn("保存 admin_accounts.avatar_url 失败:", error);
    } else {
      wrote = true;
    }
  }

  return { success: wrote, missingColumn };
}

export async function fetchStaffAvatarUrl(opts: {
  accountId?: string | null;
  courierId?: string | null;
}): Promise<string> {
  const { accountId, courierId } = opts;
  if (courierId) {
    const { data, error } = await supabase
      .from("couriers")
      .select("avatar_url")
      .eq("id", courierId)
      .maybeSingle();
    if (!error && data?.avatar_url) return String(data.avatar_url);
  }
  if (accountId) {
    const { data, error } = await supabase
      .from("admin_accounts")
      .select("avatar_url")
      .eq("id", accountId)
      .maybeSingle();
    if (!error && data?.avatar_url) return String(data.avatar_url);
  }
  return "";
}
